import audioContext from "../../internal/audio-context.js";
import SmartCache from "./smart-cache.js";
import RCData from "./rc-symbol.js";
import RemoteControl from "./remote-control.js";

import {FadeIn, FadeOut} from "./fader.js";
import {Wrap} from "../../internal/callback-wrap.js";

const DEFAULT_VOLUME = 1;
const DEFAULT_PLAYBACK_RATE = 1;
const DEFAULT_LOOP_START = 0;
const DEFAULT_DETUNE = 0;

const INVALID_TARGET_NODE = node => {
    throw Error(`Target node '${node}' of type '${typeof node}' is not a valid radio target`);
};
const MISSING_AUDIO_BUFFER = () => {
    throw Error("Missing audio buffer, radio cannot play");
};

const getGainNode = volume => {
    const node = audioContext.createGain();
    node.gain.setValueAtTime(volume,audioContext.currentTime);
    return node;
};

const getSourceNode = data => {
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = data.buffer;
    sourceNode.loop = data.loop;
    sourceNode.loopStart = data.loopStart;
    sourceNode.detune.setValueAtTime(data.detune,0);
    sourceNode.playbackRate.setValueAtTime(data.playbackRate,0);
    return sourceNode;
};

const getPanner = () => audioContext.createStereoPanner();

function Radio({
    targetNode = null, singleSource = false
}) {
    (masterNode=>{
        if(!masterNode) {
            INVALID_TARGET_NODE(masterNode);
        }
        const proxyNode = audioContext.createGain();
        proxyNode.connect(masterNode);
        targetNode = proxyNode;
    })(targetNode);

    const smartCache = new SmartCache();

    this.targetNode = targetNode;
    this.singleSource = singleSource;
    this.smartCache = smartCache;

    if(!singleSource) {
        this.stopAll = smartCache.clear;
        this.stop = smartCache.release;
    } else {
        this.stopAll = smartCache.clear;
        this.stop = smartCache.clear;
    }
    Object.freeze(this);
}

function fade(duration,callback,parameters,fadeIn) {
    const {targetNode} = this;
    (fadeIn?FadeIn:FadeOut)(targetNode,duration,()=>{
        if(!fadeIn) this.stopAll();
        targetNode.gain.cancelScheduledValues(audioContext.currentTime);
        targetNode.gain.setValueAtTime(DEFAULT_VOLUME,audioContext.currentTime+0.1);
        Wrap(callback,parameters);
    });
    return this;
}

Radio.prototype.fadeOut = function(duration,callback,...parameters) {
    fade.call(this,duration,callback,parameters,false);
}
Radio.prototype.fadeIn = function(duration,callback,...parameters) {
    fade.call(this,duration,callback,parameters,true);
}
Radio.prototype.fadeOutAsync = function(duration) {
    return new Promise(resolve => this.fadeOut(duration,resolve));
}
Radio.prototype.fadeInAsync = function(duration) {
    return new Promise(resolve => this.fadeIn(duration,resolve));
}

Radio.prototype.play = function({
    buffer,loop,callback,usePanning,
    loopStart = DEFAULT_LOOP_START,
    volume = DEFAULT_VOLUME,
    playbackRate = DEFAULT_PLAYBACK_RATE,
    detune = DEFAULT_DETUNE
}){
    loop = Boolean(loop);
    usePanning = Boolean(usePanning);

    if(!buffer) MISSING_AUDIO_BUFFER();
    if(!callback) callback = null;

    if(this.singleSource) this.smartCache.clear();

    const destination = this.targetNode;
    const gainNode = getGainNode(volume);

    gainNode.connect(destination);

    const sourceNode = getSourceNode({
        buffer,loop,loopStart,playbackRate,detune
    });

    let cacheID, remoteControl;

    sourceNode.onended = () => {
        this.smartCache.release(cacheID);
    };

    sourceNode.connect(gainNode);

    let pannerNode = null;
    if(usePanning) {
        pannerNode = getPanner();
        sourceNode.connect(pannerNode);
        pannerNode.connect(gainNode);
    } else {
        sourceNode.connect(gainNode);
    }

    cacheID = this.smartCache.add(()=>{
        sourceNode.stop();
        gainNode.disconnect(destination);

        if(callback !== null) callback;

        const remoteCallback = remoteControl.onended;
        if(remoteCallback !== null) remoteCallback();
        remoteControl[RCData].sendEndHandlers();
    });

    remoteControl = new RemoteControl({
        radio:this,sourceNode,gainNode,cacheID,pannerNode
    });

    sourceNode.start(audioContext.currentTime);

    return remoteControl;
}

export default Radio;

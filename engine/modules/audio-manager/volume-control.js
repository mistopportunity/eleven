import audioContext from "../../internal/audio-context.js";

function VolumeControl({
    volume = 1,
    output = null,
    muted = false
}) {
    const node = audioContext.createGain();
    const setVolume = value => {
        node.gain.setValueAtTime(value,audioContext.currentTime);
    };

    this.node = node;
    this.mute = () => {
        if(muted) return;
        muted = true;
        setVolume(0);
    };
    this.unmute = () => {
        if(!muted) return;
        muted = false;
        setVolume(volume);
    };
    this.toggleMute = () => {
        if(muted) {
            this.unmute();
        } else {
            this.mute();
        }
    };
    this.setVolume = value => {
        volume = value;
        if(!muted) setVolume(volume);
    };
    this.getVolume = () => {
        return volume;
    };
    Object.freeze(this);
    setVolume(muted ? 0 : volume);
    if(output !== null) node.connect(output);
}

function InstallVolumeControls({
    target,output,soundVolume,musicVolume
}) {
    const soundControl = new VolumeControl({
        volume: soundVolume,output
    });
    const musicControl = new VolumeControl({
        volume: musicVolume,output
    });

    Object.defineProperties(target,{
        musicVolume: {
            get: musicControl.getVolume,
            set: musicControl.setVolume,
            enumerable: true
        },
        soundVolume: {
            get: soundControl.getVolume,
            set: soundControl.setVolume,
            enumerable: true
        }
    });

    target.muteSound = soundControl.mute;
    target.unmuteSound = soundControl.unmute;
    target.toggleSoundMute = soundControl.toggleMute;

    target.muteMusic = musicControl.mute;
    target.unmuteMusic = musicControl.unmute;
    target.toggleMusicMute = musicControl.toggleMute;

    const soundNode = soundControl.node;
    const musicNode = musicControl.node;

    return {soundNode, musicNode};
}
export default InstallVolumeControls;

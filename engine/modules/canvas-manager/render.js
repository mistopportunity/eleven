import FrameHelper from "./frame.js";

const LOG_PREFIX = "Canvas manager";

const RENDER_LOOP_ALREADY_PAUSED = () => {
    throw Error("Render loop already paused");
};
const RENDER_LOOP_ALREADY_STARTED = () => {
    throw Error("Render loop already paused");
};
const MISSING_FRAME = () => {
    throw Error("Cannot start rendering, there is no frame to render");
};
const INVALID_FRAME = frame => {
    throw Error(`Invalid frame '${frame}'`);
};

let firstTime = true;
const LOG_LOOP_STARTED = () => {
    console.log(`${LOG_PREFIX}: ${firstTime?"Started":"Resumed"} render loop`);
    firstTime = false;
};
const LOG_LOOP_PAUSED = () => {
    console.log(`${LOG_PREFIX}: Paused render loop`);
};

function Render(canvasManager,modules) {

    let paused = true;
    let internalFrame = null;
    let renderFrame = null;

    function SetFrame(frame) {
        if(!frame) {
            INVALID_FRAME(frame);
        }
        internalFrame = frame;
        renderFrame = FrameHelper.RenderFrame.bind(internalFrame);
    }
    function GetFrame() {
        return internalFrame;
    }

    (function({context,size,pollInput,tryUpdateSize}){
        let animationFrame = null;
        const time = Object.seal({
            now: 0,
            delta: 0
        });
        const readonlyTime = Object.freeze(Object.defineProperties(new Object(),{
            now: {get: function() {return time.now}},
            delta: {get: function() {return time.delta}}
        }));
        const render = timestamp => {
            tryUpdateSize();
            pollInput();
            if(paused) return;
            time.delta = timestamp - time.now;
            time.now = timestamp;
            renderFrame(context,readonlyTime,size);
            animationFrame = requestAnimationFrame(render);
        };
        canvasManager.start = () => {
            if(!internalFrame) {
                MISSING_FRAME();
            }
            if(!paused) {
                RENDER_LOOP_ALREADY_STARTED()
            }
            paused = false;
            animationFrame = requestAnimationFrame(render);
            LOG_LOOP_STARTED();
        };
        canvasManager.pause = () => {
            if(paused) {
                RENDER_LOOP_ALREADY_PAUSED();
            }
            paused = true;
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
            LOG_LOOP_PAUSED();
        };
        canvasManager.setFrame = SetFrame;
        canvasManager.getFrame = GetFrame;
    })({
        context: modules.internal.context,
        size: canvasManager.size,
        pollInput: modules.input.poll,
        tryUpdateSize: modules.resize.tryUpdateSize
    });

    Object.defineProperties(canvasManager,{
        paused: {
            get: function() {
                return paused;
            }
        },
        frame: {
            get: GetFrame,
            set: SetFrame
        }
    });
    
    Object.freeze(this);
}
export default Render;
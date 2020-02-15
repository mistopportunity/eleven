import InstallFrame from "../frame/install.js";

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
const CANVAS_NOT_IN_DOM = () => {
    throw Error("Cannot start rendering, the canvas element is not attached to the DOM");
};
const UNEXPECTED_PARAMETERS = () => {
    throw Error("Parameter use is only valid when supplying an uninstantiated frame function");
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

    const context = modules.internal.context;

    let paused = true;
    let internalFrame = null;
    let renderFrame = null;

    const getDeepRenderer = () => {
        return internalFrame.deepRender.bind(internalFrame);
    };

    async function setFrame(frame,parameters) {
        internalFrame = await InstallFrame(frame,parameters);
        renderFrame = getDeepRenderer();
    }
    function getFrame() {
        return internalFrame;
    }

    const time = Object.seal({
        now: 0,
        delta: 0
    });
    const readonlyTime = Object.freeze(Object.defineProperties(new Object(),{
        now: {get: function() {return time.now}},
        delta: {get: function() {return time.delta}}
    }));

    const renderData = [
        context,
        canvasManager.size,
        readonlyTime
    ];
    const pollInput = modules.input.poll;
    const tryUpdateSize = modules.resize.tryUpdateSize;

    let animationFrame = null;
    const render = timestamp => {
        if(paused) return;
        tryUpdateSize();
        time.delta = timestamp - time.now;
        time.now = timestamp;
        pollInput(readonlyTime);
        renderFrame(renderData);
        animationFrame = requestAnimationFrame(render);
    };
    canvasManager.start = async ({
        target,frame,parameters,markLoaded=true,markLoading=true
    }) => {
        if(!paused) {
            RENDER_LOOP_ALREADY_STARTED();
        }

        if(markLoading) {
            canvasManager.markLoading();
        }

        if(target) {
            canvasManager.target = target;
        }
        modules.internal.trySetDefaultTarget();
        if(!modules.internal.canvasInDOM()) {
            CANVAS_NOT_IN_DOM();
        }

        if(frame) {
            await setFrame(frame,parameters);
        } else if(parameters) {
            UNEXPECTED_PARAMETERS();
        }
        if(!internalFrame) {
            MISSING_FRAME();
        }

        paused = false;
        animationFrame = requestAnimationFrame(render);
        LOG_LOOP_STARTED();
        if(markLoaded) {
            canvasManager.markLoaded();
        }
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
    canvasManager.setFrame = setFrame;
    canvasManager.getFrame = getFrame;

    Object.defineProperty(canvasManager,"paused",{
        enumerable: true,
        get: function() {
            return paused;
        }
    });
    
    Object.freeze(this);
}
export default Render;

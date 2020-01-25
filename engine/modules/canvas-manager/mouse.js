import Constants from "../../internal/constants.js";

const constants = Constants.InputRoutes;

const CLICK_UP = constants.clickUp;
const CLICK_DOWN = constants.clickDown;

const ALT_CLICK_UP = constants.altClickUp;
const ALT_CLICK_DOWN = constants.altClickDown;

const POINTER_MOVE = constants.pointerMove;

const DEFAULT_CODE = 0;
const ALT_CODE = 2;

const FORWARD_CODE = 3;
const BACK_CODE = 4;

function PointerStatus(canSendEvent,sendDown,sendUp) {
    let isDown = false;
    this.send = (sendData,down) => {
        if(down) {
            if(isDown) return;
            isDown = true;
        } else {
            if(!isDown) return;
            isDown = false;
        }
        if(!canSendEvent()) return;
        if(down) {
            sendDown(sendData);
        } else {
            sendUp(sendData);
        }
    };
    Object.defineProperty(this,"isDown",{
        get: function() {
            return isDown;
        }
    });
    Object.freeze(this);
}

function Mouse(canvasManager,modules) {
    const canvas = modules.internal.canvas;

    const translateLocation = (position,clientSize,size) => {
        return position / clientSize * size;
    };

    let pointerStatus = null;
    let altPointerStatus = null;

    const sendDataContainer = Object.seal({
        x: null,
        y: null,
        shiftKey: null,
        altKey: null,
        ctrlKey: null
    });

    const pointerData = Object.freeze(Object.defineProperties(new Object,{
        x: {get: function() {return sendDataContainer.x},enumerable:true},
        y: {get: function() {return sendDataContainer.y},enumerable:true},
        shiftKey: {get: function() {return sendDataContainer.shiftKey},enumerable:true},
        altKey: {get: function() {return sendDataContainer.altKey},enumerable:true},
        ctrlKey: {get: function() {return sendDataContainer.ctrlKey},enumerable:true},
        isDown: {get: function() {return pointerStatus.isDown},enumerable:true},
        altIsDown: {get: function() {return altPointerStatus.isDown},enumerable:true}
    }));

    const updateLocationData = sendData => {
        const container = sendDataContainer;
        container.x = sendData.x;
        container.y = sendData.y;
    };

    const getSendData = event => {
        return {
            x: translateLocation(
                event.layerX,canvas.clientWidth,canvas.width
            ),
            y: translateLocation(
                event.layerY,canvas.clientHeight,canvas.height
            ),
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey
        }
    };

    const getFrame = () => {
        return canvasManager.frame.getDeepest();
    };

    const canSendEvent = () => {
        return !canvasManager.paused;
    };
    const hasAltEvents = frame => {
        return frame.altClickDown || frame.altClickUp;
    };
    const canSendAltEvent = () => {
        if(canvasManager.paused) {
            return false;
        }
        const frame = getFrame();
        if(!frame) {
            return false;
        }
        return hasAltEvents(frame);
    };

    const stopContextMenu = event => {
        event.stopPropagation();
        if(!canSendAltEvent()) return;
        event.preventDefault();  
    };

    const trySendTarget = function(targetName,data) {
        const target = getFrame()[targetName];
        if(!target) return;
        target(data);
    }
    const getTargetBind = targetName => trySendTarget.bind(null,targetName);

    const sendPointerUp = getTargetBind(CLICK_UP);
    const sendPointerDown = getTargetBind(CLICK_DOWN);
    const sendPointerUpAlt = getTargetBind(ALT_CLICK_UP);
    const sendPointerDownAlt = getTargetBind(ALT_CLICK_DOWN);
    const sendPointerMove = (function(targetBind){
        return function(sendData,
            isDown = pointerStatus.isDown,
            altIsDown = altPointerStatus.isDown
        ) {
            sendData.isDown = isDown;
            sendData.altIsDown = altIsDown;
            targetBind(sendData);
        }
    }(getTargetBind(POINTER_MOVE)));

    pointerStatus = new PointerStatus(
        canSendEvent,sendPointerDown,sendPointerUp
    );
    altPointerStatus = new PointerStatus(
        canSendEvent,sendPointerDownAlt,sendPointerUpAlt
    );

    const getChangeTarget = event => {
        let changeTarget = null;
        const isDefault = event.button === DEFAULT_CODE;
        if(isDefault) {
            changeTarget = pointerStatus.send;
        } else if(event.button === ALT_CODE) {
            changeTarget = altPointerStatus.send;
        }
        return {changeTarget, isDefault};
    };

    const pointerChange = function(down,event) {
        const {changeTarget, isDefault} = getChangeTarget(event);
        if(!changeTarget) return;
        const sendData = getSendData(event);
        updateLocationData(sendData);
        if(down) {
            if(isDefault) {
                sendPointerMove(sendData,true,undefined);
            } else {
                sendPointerMove(sendData,undefined,true);
            }
        }
        changeTarget(sendData,down);
    };

    const pointerUp = pointerChange.bind(null,false);
    const pointerDown = pointerChange.bind(null,true);

    const pointerMove = event => {
        if(!canSendEvent()) return;
        const sendData = getSendData(event);
        updateLocationData(sendData);
        sendPointerMove(sendData);
    };

    const isNavigationControl = event => {
        return event.button === BACK_CODE || event.button === FORWARD_CODE;
    };

    this.installDOM = () => {
        const captureOptions = {capture: true};
        const target = canvas;
        
        target.addEventListener(
            "contextmenu",stopContextMenu,captureOptions
        );

        const preprocess = event => {
            event.stopPropagation();
            if(!isNavigationControl(event)) {
                event.preventDefault();
            }
            return event.isPrimary;
        };

        target.addEventListener("pointerup",function(event){
            if(!preprocess(event)) return;
            pointerUp(event);
        },captureOptions);

        target.addEventListener("pointerdown",function(event){
            if(!preprocess(event)) return;
            target.setPointerCapture(event.pointerId);
            pointerDown(event);
        },captureOptions);

        target.addEventListener("pointermove",function(event){
            if(!preprocess(event)) return;
            pointerMove(event);
        },captureOptions);
    };

    canvasManager.pointer = pointerData;

    this.updateModifiers = data => {
        Object.assign(sendDataContainer,data);
    };

    Object.freeze(this);
}
export default Mouse;

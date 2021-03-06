import Camera from "./camera.js";
import PanZoom from "./pan-zoom.js";
import DebugRenderer from "./debug-renderer.js";
import TileRenderer from "./tile-renderer/tile-renderer.js";
import GridCache from "./grid-cache.js";

const DEFAULT_TILE_SIZE = 16;
const DEFAULT_WIDTH = 1; const DEFAULT_HEIGHT = 1;

const NO_RENDER_CONFIG_METHOD = () => {
    throw Error("Missing config tile renderer!");
};

function Grid2D(baseTileSize=DEFAULT_TILE_SIZE) {
    this.baseTileSize = baseTileSize;

    let gridWidth = DEFAULT_WIDTH;
    let gridHeight = DEFAULT_HEIGHT;

    const setSize = (width,height) => {
        gridWidth = width;
        gridHeight = height;
    };

    let renderer = new Object();
    const setRenderer = newRenderer => {
        if(!newRenderer) {
            newRenderer = new Object();
        }
        if(typeof newRenderer === "function") {
            newRenderer = new newRenderer(this);
        }
        renderer = newRenderer;
    };

    const camera = new Camera(this);
    this.camera = camera;

    const getTileRenderer = data => {
        const shouldSetSize = data.setSize;
        const shouldSetRenderer = data.setRenderer;
        const tileRenderer = new TileRenderer(baseTileSize,data);
        if(shouldSetRenderer) {
            this.renderer = tileRenderer;
        }
        if(shouldSetSize) {
            setSize(tileRenderer.columns,tileRenderer.rows);
        }
        return tileRenderer;
    };

    let horizontalTiles, verticalTiles, tileSize, pixelSize;
    let halfHorizontalTiles, halfVerticalTiles;
    let tileXOffset, tileYOffset;
    let cameraXOffset, cameraYOffset;

    const [horizontalRenderData, verticalRenderData] = (()=>{
        const data = {
            location: 0, renderStride: 0,
            startTile: 0, endTile: 0
        };
        const instantiate = () => {
            return Object.seal(Object.assign({},data));
        };
        return [instantiate(),instantiate()];
    })();

    const tileArea = Object.seal({left:0,right:0,top:0,bottom:0,width:0,height:0});
    const cacheArea = Object.seal({x:0,y:0,width:0,height:0});

    const updateCacheArea = () => {
        cacheArea.x = tileArea.left * baseTileSize;
        cacheArea.y = tileArea.top * baseTileSize;
        cacheArea.width = tileArea.width * baseTileSize;
        cacheArea.height = tileArea.height * baseTileSize;
    };

    let width = 0, height = 0;
    let halfWidth = 0, halfHeight = 0;

    let panZoom = null;
    const resizePanZoom = () => {
        panZoom.resize({halfWidth,halfHeight,tileSize});
    };

    const getPanZoom = () => {
        if(!panZoom) {
            panZoom = new PanZoom(camera);
            resizePanZoom();
        }
        return panZoom;
    };

    const resize = data => {
        const hasNewSizeData = data && data.size;
        if(hasNewSizeData) {
            const size = data.size;
            width = size.width;
            height = size.height;
            halfWidth = size.halfWidth;
            halfHeight = size.halfHeight;
        }

        let newSize = Math.floor(camera.scale * baseTileSize);
        if(newSize % 2 !== 0) newSize++;

        if(newSize < baseTileSize) {
            camera.setScaleUnsafe(1);
            newSize = baseTileSize;
        }
        tileSize = newSize;
        pixelSize = 1 / tileSize;

        if(panZoom) resizePanZoom();

        horizontalTiles = Math.ceil(width / tileSize);
        verticalTiles = Math.ceil(height / tileSize);

        if(horizontalTiles % 2 === 0) horizontalTiles++;
        if(verticalTiles % 2 === 0) verticalTiles++;

        tileXOffset = -(horizontalTiles * tileSize - width) / 2;
        tileYOffset = -(verticalTiles * tileSize - height) / 2;

        halfHorizontalTiles = horizontalTiles / 2;
        halfVerticalTiles = verticalTiles / 2;

        cameraXOffset = -Math.floor(halfHorizontalTiles);
        cameraYOffset = -Math.floor(halfVerticalTiles);

        if(renderer.resize) renderer.resize();
    };

    const bottomCache = new GridCache(this), topCache = new GridCache(this);

    const getCacheProcessor = (cache,forCache) => {
        const [mutateArea,mutateAll] = forCache ?
            [cache.cacheArea,cache.cache]:
            [cache.decacheArea,cache.decache];
        return (...data) => {
            if(data.length > 0) {
                const [x,y,width,height] = data;
                mutateArea(x,y,width,height);
            } else {
                mutateAll();
            }
        };
    };

    const verifyConfigTileRender = () => {
        if(!renderer.configTileRender) NO_RENDER_CONFIG_METHOD();
        return true;
    };

    const drawCache = (cache,context) => {
        const area = cacheArea;
        context.drawImage(
            cache.data.buffer,
            area.x,area.y,
            area.width,area.height,
            0,0,width,height
        );
    };

    const roundToPixels = value => Math.round(value / pixelSize) / tileSize;

    const setRenderBounds = (
        container,dimensionSize,cameraValue,cameraOffset,renderOffset,tileLength,gridSize
    ) => {
        cameraValue += cameraOffset;

        let startTile = Math.floor(cameraValue);
        let location = Math.round(Math.round(
            (renderOffset + (startTile - cameraValue) * tileSize
        ) * 2) * 0.5);

        let renderStride = tileLength * tileSize;

        if(location <= -tileSize) {
            location += tileSize;
            tileLength--;
            renderStride -= tileSize;
            startTile++;
        }

        if(location + renderStride < dimensionSize) {
            tileLength++;
            renderStride += tileSize;
        }

        let endTile = startTile + tileLength;

        if(startTile < 0) {
            const choppedTiles = -startTile;
            const renderDifference = choppedTiles * tileSize;
            renderStride -= renderDifference;
            location += renderDifference;
            startTile = 0;
        }

        if(endTile > gridSize) {
            const choppedTiles = endTile - gridSize;
            const renderDifference = choppedTiles * tileSize;
            renderStride -= renderDifference;
            endTile = gridSize;
        }

        container.location = location;
        container.renderStride = renderStride;
        container.startTile = startTile;
        container.endTile = endTile;
    };

    const getTileLocation = (pixelX,pixelY) => {
        const renderX = horizontalRenderData.location;
        const startTileX = horizontalRenderData.startTile;

        const renderY = verticalRenderData.location;
        const startTileY = verticalRenderData.startTile;

        pixelX -= renderX; pixelY -= renderY;

        const x = pixelX / tileSize + startTileX;
        const y = pixelY / tileSize + startTileY;

        return {x,y};
    };
    const updateTileArea = () => {
        const {x,y} = getTileLocation(0,0);

        const right = x + width / tileSize;
        const bottom = y + height / tileSize;

        const xLength = right - x;
        const yLength = bottom - y;

        tileArea.left = x, tileArea.right = right;
        tileArea.top = y, tileArea.bottom = bottom;
        tileArea.width = xLength, tileArea.height = yLength;
    };
    const pointOnScreen = (x,y) => {
        const {left, right, top, bottom} = tileArea;
        return x >= left && x < right && y >= top && y < bottom;
    };

    const tileOnScreen = (x,y) => {
        const xStart = horizontalRenderData.startTile;
        const xEnd = horizontalRenderData.endTile - 1;

        const yStart = verticalRenderData.startTile;
        const yEnd = verticalRenderData.endTile - 1;

        return x >= xStart && x <= xEnd && y >= yStart && y <= yEnd;
    };

    const getScreenLocation = (x,y) => {
        return {
            x: horizontalRenderData.location + (x - horizontalRenderData.startTile) * tileSize,
            y: verticalRenderData.location + (y - verticalRenderData.startTile) * tileSize
        };
    };

    const objectOnScreen = (x,y,objectWidth,objectHeight) => {
        return !(x + objectWidth <= 0 || y + objectHeight <= 0 || x >= width || y >= height);
    };

    const updateRenderData = () => {
        const {x,y} = camera;
        setRenderBounds(horizontalRenderData,
            width,x,cameraXOffset,tileXOffset,horizontalTiles,gridWidth
        );
        setRenderBounds(verticalRenderData,
            height,y,cameraYOffset,tileYOffset,verticalTiles,gridHeight
        );
        updateTileArea();
    };

    const getArea = () => {
        updateRenderData();
        return tileArea;
    };
    this.updateRenderData = updateRenderData;

    const renderTiles = (context,time) => {
        if(renderer.paused || !renderer.renderTile) return;
        verifyConfigTileRender();

        let renderX = horizontalRenderData.location;
        const startX = horizontalRenderData.startTile;
        const tileXEnd = horizontalRenderData.endTile;
        const horizontalStride = horizontalRenderData.renderStride;

        let renderY = verticalRenderData.location;
        const startY = verticalRenderData.startTile;
        const tileYEnd = verticalRenderData.endTile;

        renderer.configTileRender({
            context, tileSize, time, startX, startY, endX: tileXEnd - 1, endY: tileYEnd - 1,
            rangeX: tileXEnd - startX, rangeY: tileYEnd - startY
        });
        for(let y = startY;y<tileYEnd;y++) {
            for(let x = startX;x<tileXEnd;x++) {
                renderer.renderTile(x,y,renderX,renderY);
                renderX += tileSize;
            }
            renderX -= horizontalStride;
            renderY += tileSize;
        }
    };

    const render = (context,size,time) => {
        if(renderer.update) renderer.update(context,size,time);

        camera.update(time);
        updateRenderData(); updateCacheArea();

        if(renderer.background) renderer.background(context,size,time);

        const useBottomCache = bottomCache.isValid;
        const useTopCache = topCache.isValid;

        if(useBottomCache) drawCache(bottomCache,context);

        if(renderer.start) renderer.start(context,size,time);

        renderTiles(context,time);
        if(renderer.render) renderer.render(context,size,time);
        if(useTopCache) drawCache(topCache,context);

        if(renderer.finalize) renderer.finalize(context,size,time);
    };

    const bindToFrame = frame => {
        frame.resize = resize, frame.render = render;
    };

    const alignToPixels = object => {
        object.x = roundToPixels(object.x), object.y = roundToPixels(object.y);
    };

    const cache = getCacheProcessor(bottomCache,true);
    const decache = getCacheProcessor(bottomCache,false);

    const cacheTop = getCacheProcessor(topCache,true);
    const decacheTop = getCacheProcessor(topCache,false);

    Object.assign(this,{
        render, resize, setSize, getTileRenderer, getPanZoom, getArea,
        pointOnScreen, tileOnScreen, objectOnScreen, alignToPixels,
        roundToPixels, getLocation: getScreenLocation, getTileLocation,
        cache, decache, cacheTop, decacheTop, bindToFrame, drawCache
    });

    Object.defineProperties(this,{
        renderer: {
            get: () => renderer,
            set: setRenderer,
            enumerable: true
        },
        width: {
            get: () => gridWidth,
            set: value => gridWidth = value,
            enumerable: true
        },
        height: {
            get: () => gridHeight,
            set: value => gridHeight = value,
            enumerable: true
        },
        tileSize: {
            get: () => tileSize,
            enumerable: true
        },
        area: {
            get: () => tileArea,
            enumerable: true
        },
        cacheArea: {
            get: () => cacheArea,
            enumerable: true
        }
    });

    this.debug = () => setRenderer(DebugRenderer);
    Object.freeze(this);
}

export default Grid2D;

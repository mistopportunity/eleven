import CollisionTypes from "./collision-types.js";
import Relationships from "./relationships.js";

const DEFAULT_TYPE = CollisionTypes.Default;
const PROJECTILE_TYPE = CollisionTypes.Projectile;
const CACHE_POSITION_LENGTH = 4;

const WARN_FLOATING_TILE_SIZE = (baseTileSize,resolutionScale) => {
    console.warn(`Tile size ${baseTileSize} cannot be even multiple of resolution scale ${resolutionScale}`);
};

const narrowBand = (a,b) => {
    return !(a.x + a.width <= b.x  ||
            a.y + a.height <= b.y ||
            a.x >= b.x + b.width  ||
            a.y >= b.y + b.height
)};

const spriteHitBoxFilter = sprite => {
    let hitBox = sprite.hitBox;
    if(!hitBox) hitBox = sprite;
    return hitBox;
};

const getCollisionType = source => {
    if(source.collisionType >= 0) return source.collisionType;
    return DEFAULT_TYPE;
};

const canCollide = (a,b) => {
    if(a.isHitBox) a = a.target;
    if(b.isHitBox) b = b.target;

    const aType = getCollisionType(a);
    const bType = getCollisionType(b);

    if(a.collisionType === PROJECTILE_TYPE) {
        if(a.owner === b) return false;
    } else if(b.collisionType === PROJECTILE_TYPE) {
        if(b.owner === a) return false;
    }

    return aType in Relationships && Relationships[aType][bType];
};

function CollisionBase(grid,resolutionScale) {
    const baseTileSize = grid.baseTileSize;

    const tileSize = baseTileSize * resolutionScale;
    if(tileSize % 1 !== 0) WARN_FLOATING_TILE_SIZE(baseTileSize,resolutionScale);

    const width = Math.floor(grid.width * tileSize);
    const height = Math.floor(grid.height * tileSize);

    const mapSize = width * height;
    const map = new Array(mapSize);

    const resetBuffer = new Array();
    this.resetBuffer = resetBuffer;

    const cacheTable = new Object();
    this.cacheTable = cacheTable;
    
    this.tileSize = tileSize;
    this.width = width; this.height = height;
    this.mapSize = mapSize;
    this.map = map;

    this.reset();
}

CollisionBase.prototype.getCache = function(ID) {
    const {cacheTable} = this;
    let container = cacheTable[ID];
    if(!container) {
        container = new Array(CACHE_POSITION_LENGTH).fill(null);
        cacheTable[ID] = container;
    }
    return container;
}
CollisionBase.prototype.dropSpriteCache = function(ID) {
    const {cacheTable} = this;
    const cache = cacheTable[ID];
    if(!cache) return;
    const {map} = this;
    for(let i = CACHE_POSITION_LENGTH;i<cache.length;i++) {
        map[cache[i]] = 0;
    }
    cacheTable.length = 0; delete cacheTable[ID];
}

CollisionBase.prototype.getCollisionTest = function(valueProcessor) {
    return sprite => {
        const hitList = this.checkSprite(sprite);
        if(!hitList.length) return null;

        sprite = spriteHitBoxFilter(sprite);
        
        let hitListIndex = 0;

        do {
            let target = valueProcessor(hitList[hitListIndex]);
            if(!target) continue;
            target = spriteHitBoxFilter(target);

            if(sprite === target || !canCollide(sprite,target)) continue;

            if(narrowBand(sprite,target)) return target;

        } while(++hitListIndex < hitList.length);

        return null;
    };
}
CollisionBase.prototype.reset = function() {
    const {map, resetBuffer} = this;
    for(let i = resetBuffer.length-1;i>-1;i--) {
        map[resetBuffer[i]] = 0;
    }
    resetBuffer.length = 0;
}
CollisionBase.prototype.write = function(startX,y,endX,endY,ID) {
    const {map, mapSize, width, resetBuffer} = this;
    while(y<endY) {
        let x = startX;
        while(x<endX) {
            const index = x + y * width;
            if(index >= 0 && index < mapSize) {
                map[index] = ID; resetBuffer.push(index);
            }
            x++;
        }
        y++;
    }
}
CollisionBase.prototype.writeCached = function(startX,y,endX,endY,ID) {
    const cache = this.getCache(ID);
    if(startX === cache[0] && y === cache[1] && endX === cache[2] && endY === cache[3]) return;

    const {map, mapSize, width} = this;

    for(let i = CACHE_POSITION_LENGTH;i<cache.length;i++) {
        map[cache[i]] = 0;
    }
    cache.length = 0; cache.push(startX,y,endX,endY);

    while(y<endY) {
        let x = startX;
        while(x<endX) {
            const index = x + y * width;
            if(index >= 0 && index < mapSize) {
                map[index] = ID; cache.push(index);
            }
            x++;
        }
        y++;
    }
}
CollisionBase.prototype.getHitList = function(startX,y,endX,endY) {
    const {map, width} = this;
    const hitValues = {}, hitList = [];
    while(y<endY) {
        let x = startX;
        while(x<endX) {
            const index = x + y * width;
            const value = map[index];
            if(value && !(value in hitValues)) {
                hitValues[value] = true;
                hitList.push(value);
            }
            x++;
        }
        y++;
    }
    return hitList;
}
CollisionBase.prototype.spriteResMap = function(sprite) {
    const hitBox = spriteHitBoxFilter(sprite);

    const {tileSize} = this;
    const {x,y,width,height} = hitBox;

    const startX = Math.floor(x * tileSize);
    const startY = Math.floor(y * tileSize);

    const endX = Math.ceil((x + width) * tileSize);
    const endY = Math.ceil((y + height) * tileSize);

    return {x:startX,y:startY,endX,endY};
}
CollisionBase.prototype.checkSprite = function(sprite) {
    const {x,y,endX,endY} = this.spriteResMap(sprite);
    return this.getHitList(x,y,endX,endY);
}
CollisionBase.prototype.mapSprite = function(sprite,ID) {
    const {x,y,endX,endY} = this.spriteResMap(sprite);
    this.write(x,y,endX,endY,ID);
}
CollisionBase.prototype.mapSpriteCached = function(sprite,ID) {
    const {x,y,endX,endY} = this.spriteResMap(sprite);
    this.writeCached(x,y,endX,endY,ID);
}

export default CollisionBase;

import PlayerDirections from "../world2D/player/player-directions.js";

const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 16;

const ANIMATION_ROW_COUNT = 4;
const FRAME_TIME = 100;

//Conforms to PlayerDirections
const DIRECTION_MATRIX = Object.freeze([
    SPRITE_WIDTH,SPRITE_WIDTH*2,0,SPRITE_WIDTH*3
]);

const DIRECTION_LOOKUP = {
    "up": PlayerDirections.Up,
    "right": PlayerDirections.Right,
    "down": PlayerDirections.Down,
    "left": PlayerDirections.Left
};

const DEFAULT_DIRECTION = 2;

function AnimatedSprite(texture,x,y) {

    this.texture = texture; texture = null;

    if(!x) x = 0; if(!y) y = 0;

    Object.defineProperty(this,"directionMatrix",{
        value: DIRECTION_MATRIX,
        enumerable: true
    });

    this.x = x, this.y = y;
    this.width = 1, this.height = 1;

    let direction = DEFAULT_DIRECTION;

    this.getPosition = () => [this.x,this.y];
    this.setPosition = (x,y) => (this.x = x, this.y = y);

    Object.defineProperty(this,"direction",{
        get: () => direction,
        set: value => {
            if(typeof value === "string") {
                const lookupResult = DIRECTION_LOOKUP[value];
                if(isNaN(lookupResult)) return;
                value = lookupResult;
            }
            direction = value;
        }
    });

    let animationStart = 0;

    const getAnimationRow = time => {
        const t = time.now - animationStart;
        const row = Math.floor(t / FRAME_TIME);
        return row % ANIMATION_ROW_COUNT * SPRITE_HEIGHT;
    };

    const getTextureY = time => {
        if(this.moving) {
            if(animationStart === 0) {
                animationStart = time.now - FRAME_TIME;
            }
            return getAnimationRow(time);
        } else {
            if(animationStart !== 0) {
                const row = getAnimationRow(time);

                if((row / SPRITE_HEIGHT) % 2 === 0) animationStart = 0;

                return row;
            }
            return 0;
        }
    };

    this.alignToPixels = true;
    this.roundRenderPosition = true;

    this.render = (context,x,y,width,height,time) => {
        const textureX = this.directionMatrix[direction];
        const textureY = getTextureY(time);

        context.drawImage(
            this.texture,textureX,textureY,SPRITE_WIDTH,SPRITE_HEIGHT,
            x,y,width,height
        );
    };
}
export default AnimatedSprite;
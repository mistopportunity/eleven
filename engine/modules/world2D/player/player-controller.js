import PlayerDirections from "./player-directions.js";
import PlayerInput from "./player-input.js";

import CollisionTypes from "../../collision/collision-types.js";

const MAX_CHANGE_LIMIT = 2 / 16; //Max position change per frame
const DEFAULT_SPEED = 4; //Tiles per second

const POLARITY_LOOKUP = [];
POLARITY_LOOKUP[PlayerDirections.Up] = -1;
POLARITY_LOOKUP[PlayerDirections.Down] = 1;
POLARITY_LOOKUP[PlayerDirections.Left] = -1;
POLARITY_LOOKUP[PlayerDirections.Right] = 1;

const TRIGGER_TYPE = CollisionTypes.Trigger;
const LIVING_TRIGGER_TYPE = CollisionTypes.LivingTrigger;

function PlayerController(
    grid,sprite,collisionLayer,tileCollision
) {

    let locked = false, inputActive = false, colliding = false;

    const getMoving = () => !locked && inputActive && !colliding;

    let pendingDirection = null;

    const trySetDirection = value => {
        if(locked) {
            pendingDirection = value;
            return;
        }
        sprite.direction = value;
    };

    const updateLocked = value => {
        locked = Boolean(value);
        if(!locked && pendingDirection !== null) {
            if(inputActive) {
                sprite.direction = pendingDirection;
            }
            pendingDirection = null;
        }
    };

    Object.defineProperties(this,{
        locked: {
            get: () => locked,
            set: updateLocked,
            enumerable: true
        },
        inputActive: {
            get: () => inputActive,
            set: value => inputActive = Boolean(value),
            enumerable: true
        },
        direction: {
            get: () => sprite.direction,
            set: trySetDirection,
            enumerable: true
        },
        pendingDirection: {
            //For serious serialization business only! Seriousailization?
            get: () => pendingDirection,
            set: value => pendingDirection = value
        }
    });
    Object.defineProperties(sprite,{
        colliding: {
            get: () => colliding,
            enumerable: true
        },
        moving: {
            get: getMoving,
            enumerable: true
        }
    });
    
    this.lock = () => updateLocked(true);
    this.unlock = () => updateLocked(false);

    const collides = () => {
        let result = collisionLayer.collides(sprite);
        if(!result) {
            result = tileCollision.collides(sprite);
        }
        return result;
    };

    this.triggerHandler = null;

    const handlePositionUpdate = (change,direction,targetProperty,lengthProperty) => {
        const polarity = POLARITY_LOOKUP[direction];
        sprite[targetProperty] += change * polarity;

        const collisionResult = collides(sprite);

        if(!collisionResult) return;

        let collidedWith = collisionResult;
        if(collidedWith.isHitBox) collidedWith = collidedWith.target;

        const {collisionType} = collidedWith;
        if(collisionType === TRIGGER_TYPE || collisionType === LIVING_TRIGGER_TYPE) {
            if(collidedWith.trigger) collidedWith.trigger(sprite);
            return;
        }

        if(polarity < 0) {
            if(collidedWith[targetProperty] > sprite[targetProperty]) return;
        } else {
            if(sprite[targetProperty] > collidedWith[targetProperty]) return;
        }

        const hitBox = sprite.hitBox || sprite;
        const hitBoxDifference = (hitBox[lengthProperty] - sprite[lengthProperty]) / 2;

        colliding = collidedWith;
        let newValue = collisionResult[targetProperty];

        if(polarity < 0) {
            newValue += collisionResult[lengthProperty];
        } else {
            newValue -= sprite[lengthProperty];
        }

        newValue -= hitBoxDifference * polarity;
        sprite[targetProperty] = newValue;

    };

    const update = ({deltaSecond}) => {
        colliding = false;

        if(locked || !inputActive) return;

        const {velocity, direction} = sprite;

        let change = velocity * deltaSecond;
        change = grid.roundToPixels(change);

        if(change > MAX_CHANGE_LIMIT) change = MAX_CHANGE_LIMIT;

        let targetProperty, lengthProperty;

        if(direction % 2 !== 0) {
            targetProperty = "x", lengthProperty = "width";
        } else {
            targetProperty = "y", lengthProperty = "height";
        }

        if(this.triggerHandler) this.triggerHandler(sprite);

        handlePositionUpdate(
            change,direction,targetProperty,lengthProperty
        );
    };
    if(sprite.addUpdate) {
        sprite.addUpdate(update);
    } else {
        sprite.update = update;
    }

    if(!sprite.velocity) {
        sprite.velocity = DEFAULT_SPEED;
    }
    this.sprite = sprite;

    let inputHandler = null;
    this.getInputHandler = directionImpulses => {
        if(!inputHandler) inputHandler = new PlayerInput(this,directionImpulses);
        return inputHandler;
    };
}

export default PlayerController;

import Install from "./internal/install.js";

import CanvasManager from "./modules/canvas-manager/canvas-manager.js";
import ResourceManager from "./modules/resource-manager/resource-manager.js";
import AudioManager from "./modules/audio-manager/audio-manager.js";
import Frame from "./modules/frame/frame.js";
import Grid2D from "./modules/grid2D/grid2D.js";

import KeyBind from "./modules/frame/key-bind.js";
import ManagedGamepad from "./modules/managed-gamepad/managed-gamepad.js";

import SpriteLayer from "./modules/sprite/sprite-layer.js";
import SpriteFollower from "./modules/sprite/sprite-follower.js";
import DispatchRenderer from "./modules/grid2D/dispatch-renderer.js";

import UVTCLighting from "./modules/uvtc/uvtc-lighting.js";
import UVTCReflection from "./modules/uvtc/uvtc-reflection.js";

import TileCollision from "./modules/collision/tile-collision.js";
import CollisionLayer from "./modules/collision/collision-layer.js";

import PlayerController from "./modules/uvtc/player/player-controller.js";
import InstallHitBox from "./modules/sprite/hitbox.js";

import AnimatedSprite from "./modules/uvtc/animated-sprite.js";
import WaterBackground from "./modules/uvtc/water-background.js";
import TileSprite from "./modules/sprite/tile-sprite.js";

import TextLayer from "./modules/uvtc/text/text-layer.js";
import SpeechBox from "./modules/uvtc/text/speech-box.js";
import WorldImpulse from "./modules/uvtc/world-impulse.js";

import MultiLayer from "./internal/multi-layer.js";
import FrameTimeout from "./internal/frame-timeout.js";
import CollisionTypes from "./modules/collision/collision-types.js";
import Singleton from "./packer/singleton.js";

import TextSprite from "./modules/uvtc/text-sprite.js";

const NamespaceTable = (name,sourceTable) => {
    return Singleton({
        name: name,
        module: function() {
            Object.entries(sourceTable).forEach(([property,value]) => {
                this[property] = value;
            });
            Object.freeze(this);
        }
    });
};

const Eleven = Install([
    Singleton({
        module: CanvasManager,
        deferInstantiation: true
    }),
    Singleton({
        module: ResourceManager,
        deferInstantiation: true
    }),
    Singleton({
        module: AudioManager,
        deferInstantiation: true
    }),
    Frame,
    MultiLayer,
    Grid2D,
    SpriteLayer,
    KeyBind,
    ManagedGamepad,
    SpriteFollower,
    UVTCLighting,
    Singleton({
        module: UVTCReflection,
        deferInstantiation: true
    }),
    DispatchRenderer,
    CollisionLayer,
    TileCollision,
    PlayerController,
    InstallHitBox,
    AnimatedSprite,
    WaterBackground,
    TileSprite,
    TextSprite,
    TextLayer,
    SpeechBox,
    WorldImpulse,
    FrameTimeout,
    NamespaceTable("CollisionTypes",CollisionTypes)
]);

export default Eleven;

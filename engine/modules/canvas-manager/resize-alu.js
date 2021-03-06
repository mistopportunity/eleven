const SIZE_VALUES = [
    "width", "height",
    "halfWidth", "halfHeight",
    "doubleWidth", "doubleHeight",
    "quarterWidth", "quarterHeight",
    "horizontalRatio", "verticalRatio",
    "largestDimension", "smallestDimension",
    "greaterWidth", "greaterHeight",
    "equalDimensions", "unequalDimensions"
];

function GetContainer() {
    const sizeValues = new Object();

    SIZE_VALUES.forEach(valueType => sizeValues[valueType] = null);

    Object.seal(sizeValues);

    return sizeValues;
}
function GetResizeALU(target,sizeValues) {
    return (width,height) => {

        target.width = width;
        target.height = height;

        sizeValues.width = width;
        sizeValues.height = height;

        sizeValues.doubleWidth = width * 2;
        sizeValues.doubleHeight = height * 2;

        sizeValues.halfWidth = width / 2;
        sizeValues.halfHeight = height / 2;

        sizeValues.quarterWidth = width / 4;
        sizeValues.quarterHeight = height / 4;

        sizeValues.horizontalRatio = width / height;
        sizeValues.verticalRatio = height / width;

        const greaterWidth = width >= height;
        sizeValues.greaterHeight = !greaterWidth;
        sizeValues.greaterWidth = greaterWidth;

        if(greaterWidth) {
            sizeValues.largestDimension = width;
            sizeValues.smallestDimension = height;
        } else {
            sizeValues.largestDimension = height;
            sizeValues.smallestDimension = width;
        }

        const equalDimensions = width === height;
        sizeValues.equalDimensions = equalDimensions;
        sizeValues.unequalDimensions = !equalDimensions;
    };
}

const ResizeALU = Object.freeze({
    GetResizer: GetResizeALU, GetContainer
});

export default ResizeALU;

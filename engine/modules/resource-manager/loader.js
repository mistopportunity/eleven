import CacheController from "./cache-controller.js";
import ResourceLoaders from "./resource-loaders.js";
import FallbackResources from "./fallback-resources.js";
import LoadValidators from "./load-validators.js";

const FAILED_RESOURCE = FallbackResources.FailedResource;
const LOG_NAME = "Resource manager";
const INVALID_RESOURCE_DATA = () => {
    throw "Invalid resource data!";
};
const LOAD_CONCURRENCY_THREAT = () => {
    throw Error("Only one loading operation can occur at any given time. " +
    "This prevents potential concurrency bugs. Please reconsider your queue usage.");
};

const SetEntry = CacheController.set;
const GetEntry = CacheController.get;
const EntryExists = CacheController.has;

function LoadResource(resourceLink) {
    const {name, lookupName, type} = resourceLink;
    return new Promise(resolve => {
        const resourceLoader = ResourceLoaders[type];
        fetch(name).then(response => {
            if(!response.ok) {
                throw response.statusText;
            }
            return response;
        }).then(resourceLoader).then(data => {
            if(!data) INVALID_RESOURCE_DATA();
            LoadValidators[type](data);
            SetEntry(resourceLink,data);
            console.log(`${LOG_NAME}: Loaded '${name}'`);
            resolve(GetEntry(lookupName,type));
        }).catch(error => {
            SetEntry(resourceLink,FAILED_RESOURCE);
            console.error(`${LOG_NAME}: ${error} '${name}'`);
            resolve(GetEntry(lookupName,type));
        });
    });
}

function LoadResources(resourceLinks) {
    return Promise.all(resourceLinks.map(LoadResource));
}

const GetLoader = resourceQueue => {
    const getLoadList = (resourceLinks,overwrite) => {
        const loadList = {};
        resourceLinks.forEach(resourceLink => {
            const {name,lookupName,type} = resourceLink;
    
            let oldEntry = GetEntry(lookupName,type);
            if(oldEntry === FAILED_RESOURCE) {
                oldEntry = false;
            }
            let pass = false;

            if(overwrite) {
                //overwrite, old entry
                //overwrite, no old entry
                pass = true;
            } else if(oldEntry) {
                //no overwrite, but old entry
                pass = false;
            } else {
                //no overwrite, but no entry
                pass = true;
            }
    
            if(pass) {
                loadList[name] = resourceLink;
            }
        });
        return Object.values(loadList);
    };
    let loadLock = false;
    return async (overwrite=false) => {
        if(loadLock) LOAD_CONCURRENCY_THREAT();
        if(!resourceQueue.length) return;
        const resourceLinks = resourceQueue.splice(0);
        const loadList = getLoadList(resourceLinks,overwrite);
        if(!loadList.length) return;
        loadLock = true;
        const resources = await LoadResources(loadList);
        loadLock = false;
        return resources;
    };
};

export default GetLoader;

// workaround script to keep TypeScript from crashing in VSCode
// since Pulumi has too big of a package
// run this script after installing NPM packages for infrastructure
// originally created by Ankvi:
// https://github.com/pulumi/pulumi-azure-native/issues/1997#issuecomment-1370835665
import { readdir, rm, writeFile, readFile } from "fs/promises";
import { join } from 'path';

const rootFolder = join(__dirname, '../node_modules/@pulumi/azure-native');
const enumsFolder = join(rootFolder, 'types/enums');

const modulesToKeep = [
    // foundational modules - do not remove
    "types",
    "config",

    // Azure feature modules - include only what you need
    // see this list for all available options:
    // https://www.pulumi.com/registry/packages/azure-native/api-docs/
    "resources",     // for Resource Groups
    "apimanagement", // for API Management
    "authorization", // for getting Client Config
    "eventgrid",     // for Event Grid
    "insights",      // Azure Insights
    "storage",     // for Storage Account
    "web"
];

const toolName = '@pulumi/azure-native cleanup tool';
const stubContent = 'Object.defineProperty(exports, "__esModule", { value: true });';

async function isStub(path: string) {
    const contents = await readdir(path);
    if (contents.length !== 1 || contents[0] !== 'index.js') {
        return false;
    }

    const indexContents = await readFile(join(path, 'index.js'));
    return indexContents.toString() === stubContent;
}

async function getPreviousVersionFolders(path: string) {
    const moduleFolders = await getFolderNames(path);
    return moduleFolders
        .filter(x => {
            const match = x.match(/v\d{8}(?:preview)?$/);
            return match && match.length === 1;
        })
        .map(x => join(path, x));
}

async function getFolderNames(path: string) {
    const dirents = await readdir(path, {
        withFileTypes: true
    });

    return dirents
        .filter(x => x.isDirectory())
        .map(x => x.name);
}

async function getFolders(rootPath: string) {
    const modules = await getFolderNames(rootPath);

    const foldersPromises = modules.map(async (module) => {
        let folders: string[];
        const moduleFolderPath = join(rootPath, module);
        if (modulesToKeep.includes(module)) {
            folders = await getPreviousVersionFolders(moduleFolderPath);
        } else {
            folders = [moduleFolderPath];
        }

        // remove stub folders (already cleaned up)
        const nonStubFolders: string[] = [];
        for (let folder of folders) {
            const isStubFolder = await isStub(folder);
            if (!isStubFolder) {
                nonStubFolders.push(folder);
            }
        }
        return nonStubFolders;
    });

    const moduleFolders = await Promise.all(foldersPromises);
    return moduleFolders.flat();
}

async function getFoldersToClean() {
    const getFoldersPromises = [rootFolder, enumsFolder].map(getFolders);
    const folders = await Promise.all(getFoldersPromises);
    return folders.flat();
}

export async function cleanFoldersAsync() {
    const folders = await getFoldersToClean();

    if (!folders.length) {
        console.info(`${toolName}: No folders to clean up. :)`);
        return;
    }

    const removeTasks = await Promise.all(folders.map(async folder => {
        const files = await readdir(folder, {
            withFileTypes: true
        });

        return files.map(file => {
            const path = join(folder, file.name);
            console.info(`${toolName}: cleaning up ${path}...`);
            return rm(path, {
                recursive: true,
                force: true
            });
        });
    }));

    const removeTasksFlattened = removeTasks.flat();
    await Promise.all(removeTasksFlattened);

    await Promise.all(folders.map(async folder => {
        const newIndexFile = join(folder, "index.js");
        await writeFile(newIndexFile, stubContent);
    }));
}

cleanFoldersAsync();

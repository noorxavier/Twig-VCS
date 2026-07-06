#!/usr/bin/env node

import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { diffLines } from 'diff';
import chalk from 'chalk';
import { Command } from 'commander';

const program = new Command();

class Twig{
    constructor(repoPath='.'){
        this.repoPath = path.join(repoPath, '.twig');
        this.objectPath = path.join(this.repoPath, 'objects');
        this.headPath = path.join(this.repoPath, 'HEAD');
        this.indexPath = path.join(this.repoPath, 'index');
        this.chunkPath = path.join(this.repoPath,'chunks');
this.manifestPath = path.join(this.repoPath,'manifests');
        this.init();
    }

    async init(){
        await fs.mkdir(this.chunkPath,{recursive:true});
        await fs.mkdir(this.manifestPath,{recursive:true});
        await fs.mkdir(this.objectPath, {recursive: true});
        try{
            await fs.writeFile(this.headPath, '', {flag: 'wx'});
            await fs.writeFile(this.indexPath, JSON.stringify([]), {flag: 'wx'});
        }
        catch(error){
            console.log('Twig repository already initialized.');
        }
    }
    chunkFile(buffer, chunkSize = 64 * 1024) {

    const chunks = [];

    for (
        let i = 0;
        i < buffer.length;
        i += chunkSize
    ) {
        chunks.push(
            buffer.slice(
                i,
                i + chunkSize
            )
        );
    }

    return chunks;
}
hashChunk(chunk){
    return crypto
        .createHash('sha1')
        .update(chunk)
        .digest('hex');
}
async storeChunk(chunk){

    const hash = this.hashChunk(chunk);

    const dir = hash.slice(0,2);
    const file = hash.slice(2);

    const chunkDir =
        path.join(this.chunkPath, dir);

    await fs.mkdir(
        chunkDir,
        { recursive: true }
    );

    const chunkPath =
        path.join(chunkDir, file);

   try{

    await fs.access(chunkPath);

    return {
        hash,
        size: chunk.length,
        exists: true
    };

}
catch{

    await fs.writeFile(
        chunkPath,
        chunk
    );

    return {
        hash,
        size: chunk.length,
        exists: false
    };
}

   
}

    hashObject(content){
        return crypto.createHash('sha1').update(content).digest('hex');
    }

    //----------------------------------------------------
    //  Git-style object storage applied here
    //----------------------------------------------------
    // async add(fileToBeAdded){
    //     const fileData =await fs.readFile(fileToBeAdded);
    //     const fileHash = this.hashObject(fileData);
    //     console.log(fileHash);

    //     const dir = fileHash.slice(0, 2);
    //     const file = fileHash.slice(2);
    //     const objectDir = path.join(this.objectPath, dir);
    //     await fs.mkdir(objectDir, { recursive: true });

    //     const objectPath = path.join(objectDir, file);
    //     await fs.writeFile(objectPath, fileData);

    //     await this.updateStagingArea(fileToBeAdded, fileHash);
        
    //     console.log(`Added ${fileToBeAdded}`);
    // }
    async storeManifest(manifest){

    const data =
        JSON.stringify(manifest);

    const hash =
        this.hashObject(data);

    const dir =
        hash.slice(0,2);

    const file =
        hash.slice(2);

    const manifestDir =
        path.join(
            this.manifestPath,
            dir
        );

    await fs.mkdir(
        manifestDir,
        {recursive:true}
    );

    const manifestPath =
        path.join(
            manifestDir,
            file
        );

    await fs.writeFile(
        manifestPath,
        data
    );

    return hash;
}

   async add(fileToBeAdded){

    const fileData =
        await fs.readFile(fileToBeAdded);

    const chunks =
        this.chunkFile(fileData);
let newChunks = 0;
let reusedChunks = 0;
    console.log(
        `Total Chunks: ${chunks.length}`
    );

    const manifestChunks = [];

for(const chunk of chunks){

    const info = await this.storeChunk(chunk);

    if(info.exists){
        reusedChunks++;
    }
    else{
        newChunks++;
    }

    manifestChunks.push(info);
}
const manifest = {
    type: "asset",
    fileName: fileToBeAdded,
    size: fileData.length,
    chunks: manifestChunks
};
const manifestHash =
    await this.storeManifest(manifest);
    await this.updateStagingArea(
    fileToBeAdded,
    manifestHash
);

console.log("\nStorage Stats");
console.log("----------------");
console.log(`Total Chunks : ${chunks.length}`);
console.log(`New Chunks   : ${newChunks}`);
console.log(`Reused       : ${reusedChunks}`);
console.log(
    "\nManifest Hash:",
    manifestHash
);

    console.log(
        `Added ${fileToBeAdded}`
    );
}

    async updateStagingArea(filePath, manifestHash){

    const index = JSON.parse(
        await fs.readFile(
            this.indexPath,
            {encoding:'utf-8'}
        )
    );

    index.push({
        path:filePath,
        manifestHash
    });

    await fs.writeFile(
        this.indexPath,
        JSON.stringify(index,null,2)
    );
}
    //----------------------------------------------------
    //  Git-style object storage applied here
    //----------------------------------------------------
    async commit(message){
        const index = JSON.parse(await fs.readFile(this.indexPath, {encoding: 'utf-8'}));
        const parentCommit = await this.getCurrentHead();

        const commitData = {
            time: new Date().toISOString(),
            message,
            files: index,
            parent: parentCommit
        };

        const commitHash = this.hashObject(JSON.stringify(commitData));

        const dir = commitHash.slice(0, 2);
        const file = commitHash.slice(2);
        const commitDir = path.join(this.objectPath, dir);
        await fs.mkdir(commitDir, { recursive: true });

        const commitPath = path.join(commitDir, file);
        await fs.writeFile(commitPath, JSON.stringify(commitData));

        await fs.writeFile(this.headPath, commitHash);
        await fs.writeFile(this.indexPath, JSON.stringify([]));

        console.log(`Committed successfully created : ${commitHash}`);
    }

    async getCurrentHead(){
        try{
            return await fs.readFile(this.headPath, {encoding: 'utf-8'});
        }
        catch(error){
            return null;
        }
    }

    async log(){
        let currentCommitHash = await this.getCurrentHead();

        while(currentCommitHash){
            const commitData = JSON.parse(
                await this.getCommitData(currentCommitHash)
            );

            console.log('--------------------------\n');
            console.log(`commit : ${currentCommitHash}\nDate:
             ${commitData.time} \n\n    ${commitData.message}\n\n`);

            currentCommitHash = commitData.parent;
        }
    }

    async showCommitDiff(commitHash){
        const commitData = JSON.parse(await this.getCommitData(commitHash));
        if(!commitData){
            console.log("Commit not found.");
            return;
        }
        console.log("changes in the last commit are: ");

        for(const file of commitData.files){
            console.log(`File: ${file.path}`);
            const fileContent = await this.getFilecontent(file.hash);

            if(commitData.parent){
                const parentCommitData = JSON.parse(
                    await this.getCommitData(commitData.parent)
                );

                const getParentFileContent = await this.getParentFileContent(parentCommitData, file.path);

                if(getParentFileContent !== undefined){
                    console.log('\nDiff:');

                    const diff = diffLines(getParentFileContent, fileContent);

                    diff.forEach(part =>{
                        if (part.added){
                            process.stdout.write(chalk.green("++" + part.value));
                        }
                        else if(part.removed){
                            process.stdout.write(chalk.red("--" + part.value));
                        }
                        else{
                            process.stdout.write(chalk.grey(part.value));
                        }
                    });
                    console.log('\n');
                } else{
                    console.log("New file in this commit");
                }
            }
            else{
                console.log("First commit");
            }
        }
    }

    async getParentFileContent(parentCommitData, filePath){
        const parentFile = parentCommitData.files.find(f => f.path === filePath);
        if(parentFile){
            return await this.getFilecontent(parentFile.hash);
        }
    }

    //----------------------------------------------------
    //  Git-style object storage applied here
    //----------------------------------------------------
    async getCommitData(commitHash){
        const dir = commitHash.slice(0, 2);
        const file = commitHash.slice(2);
        const commitPath = path.join(this.objectPath, dir, file);

        try {
            return await fs.readFile(commitPath, {encoding: 'utf-8'});
        } catch (error) {
            console.log("Failed to read commit data:", error);
            return null;
        }
    }

    //----------------------------------------------------
    //  Git-style object storage applied here
    //----------------------------------------------------
    async getFilecontent(fileHash){
        const dir = fileHash.slice(0, 2);
        const file = fileHash.slice(2);
        const objectPath = path.join(this.objectPath, dir, file);

        return fs.readFile(objectPath, {encoding: 'utf-8'});
    }
} 

//------------------------------------------------------------
// CLI Commands
//------------------------------------------------------------
program.command('init').action(()=>{
    const twig = new Twig();
});

program.command('add <file>').action(async(file)=>{
    const twig = new Twig();
    await twig.add(file);
});

program.command('commit <message>').action(async(message)=>{
    const twig = new Twig();
    await twig.commit(message);
});

program.command('log').action(async()=>{
    const twig = new Twig();
    await twig.log();
});

program.command('show <commitHash>').action(async(commitHash)=>{
    const twig = new Twig();
    await twig.showCommitDiff(commitHash);
});

program.parse(process.argv);

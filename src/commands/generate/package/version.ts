/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable no-await-in-loop */
import * as child from 'node:child_process';
import * as util from 'node:util';
import  { writeFile , readFile } from 'node:fs';
import path from 'node:path';
import * as input from 'node:readline/promises';
import * as cron from 'node-cron';

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, AuthInfo, Connection, scratchOrgCreate,  ScratchOrgCreateOptions, ScratchOrgCreateResult, Org /* , ScratchOrgRequest , ConfigAggregator */ } from '@salesforce/core';

import { RunTestsRequest,  RunTestsResult ,TestsNode } from '../../../types.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url)
const messages = Messages.loadMessages('generate-package-version', 'generate.package.version');

const exec = util.promisify(child.exec);

export type GeneratePackageVersionResult = {
  path: string;
};

export default class GeneratePackageVersion extends SfCommand<GeneratePackageVersionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static packageNameFlag: string | undefined;
  public static targetOrgFlag: string | undefined;
  public static installationKeyFlag: string | undefined;
  public static versionNameFlag: string | undefined;
  public static versionNumberFlag: string | undefined;
  public static packageTypeFlag: string | undefined;
  public static ignoreVersionFlag: boolean | undefined;
  public static ignoreScratchOrgFlag: boolean | undefined;

  // flag pakcage name
  // flag target-org
  // flag installation-key
  // flag versionName
  // flag versionNumber

  public static readonly flags = {
    'package-name': Flags.string({
      summary: messages.getMessage('flags.package-name.summary'),
      description: messages.getMessage('flags.package-name.description'),
      char: 'p',
      required: true,
    }),
    'target-org': Flags.requiredOrg({
      summary: messages.getMessage('flags.target-org.summary'),
      description: messages.getMessage('flags.target-org.description'),
      char: 't',
      required: true,
    }),
    'installation-key': Flags.string({
      summary: messages.getMessage('flags.installation-key.summary'),
      description: messages.getMessage('flags.installation-key.description'),
      char: 'k',
      required: false,
    }),
    'version-name': Flags.string({
      summary: messages.getMessage('flags.version-name.summary'),
      description: messages.getMessage('flags.version-name.description'),
      char: 'v',
      required: false,
    }),
    'version-number': Flags.string({
      summary: messages.getMessage('flags.version-number.summary'),
      description: messages.getMessage('flags.version-number.description'),
      char: 'n',
      required: false,
    }),
    'package-type': Flags.string({
      summary: messages.getMessage('flags.package-type.summary'),
      description: messages.getMessage('flags.package-type.description'),
      required: false,
    }),
    'ignore-version' : Flags.boolean({
      summary: messages.getMessage('flags.ignore-version.summary'),
      description: messages.getMessage('flags.ignore-version.description'),
      char: 'c',
      required: false,
      default: false
    }),
    'ignore-scratch-org' : Flags.boolean({
      summary: messages.getMessage('flags.ignore-scratch-org.summary'),
      description: messages.getMessage('flags.ignore-scratch-org.description'),
      char: 's',
      required: false,
      default: false
    }),
  };

  public static openOrg(self: GeneratePackageVersion): void {
    cron.schedule('* * * * *', async () => {
      const result = await exec('sf org open -o mindful-koala');
      self.log('openOrg', result);
    });
    
  }

  public configureJSONFile(self: GeneratePackageVersion, versionNumber: string | undefined, versionName: string | undefined): void {
   
    let decodedStr;
    const pathInput = 'config/sfdx-project.json';
    const packageName = GeneratePackageVersion.packageNameFlag;
    
    // TO BE REMOVED BEFORE PLUGIN LINK
    const splitedDir = process.cwd().split('\\');
    splitedDir.splice(splitedDir.length - 1, 1);
    const stringDir: string = splitedDir.join('\\');
    // TO BE REMOVED BEFORE PLUGIN LINK
    
    // process.cwd()
    this.log('process.cwd()',process.cwd());
    const filePath = path.join(stringDir , pathInput);
    this.log('filePath',filePath);
    
    readFile(filePath, (error, data) => {
      // if(error){return;}

      const jsonData = data.toJSON();
      const buffedData = Buffer.from(jsonData.data);
      const utf8Decoder = new TextDecoder('UTF-8');

      decodedStr = utf8Decoder.decode(buffedData);
      this.log('typeof',typeof decodedStr);
      this.log('decodedStr',decodedStr);

      const jsonFile = JSON.parse(decodedStr);
      
      for(const packageDir of jsonFile.packageDirectories){
        if(packageDir.packageDirectories.package === packageName){
          packageDir.versionName = versionName;
          packageDir.versionNumber = versionNumber;
        }
      }

      writeFile(filePath, JSON.stringify(jsonFile, null, 2), (err) => {
        if (err) {
          this.log('Failed to write updated data to file');
          return;
        }
        this.log('Updated file successfully');
      });
      
    });

  }

  public async runApexTests(connection: Connection): Promise<void> {
    
    let result: RunTestsResult = {
      apexLogId: '',
      codeCoverage: [],
      codeCoverageWarnings: [],
      flowCoverage: [],
      flowCoverageWarnings: [],
      numFailures: 0,
      numTestsRun: 0,
      successes: [],
      failures: [],
      totalTime: 0
    };

    const queryApexStr = 'SELECT Id, Name FROM ApexClass WHERE isValid = true AND Status = \'Active\' AND (Name LIKE \'%Test\' OR Name LIKE \'%Tests\')';

    const queryApexClassObj = await connection.tooling.query<{
      Id: string;
      Name: string;
    }>(queryApexStr);
    
    if(queryApexClassObj.records){
      for(const query of queryApexClassObj.records){
        const testNode: TestsNode = {
          classId: query.Id
        };
        
        const request: RunTestsRequest = {
          tests: [testNode],
          testLevel: 'RunSpecifiedTests',
        };
        this.log('◼  Running Apex classes...');
        await connection.tooling.runTestsSynchronous(request)
        .then(res =>{
          if(res){
            result = res;
          }
        })
        .catch(error =>{
          this.error('  ◼ Error running Apex queries...', error);
          error.exit();
        })

        this.log('result: ',result);

        // ✔ \ ◼  ▸ ⬛
        // this.log('✔ \\ ◼  ▸', result);

      }
    }
  }

  public async installPackageVersion(target: string, installKey: string | undefined, packageAlias: string | undefined): Promise<void> {
    this.log('Installing package...');
    this.log('target',target);
    this.log('installKey',installKey);
    this.log('packageAlias',packageAlias);
    let command = `sf package install --package ${packageAlias} --target-org ${target} --publish-wait 6 --wait 10`;
    if(installKey){
      command += ` --installation-key ${installKey}`;
    }
    await exec(command)

  }

  public async createPackageVersion(devHub: string, installKey: string | undefined, packageName: string): Promise<void> {
    const ignoreVersion: boolean | undefined = GeneratePackageVersion.ignoreVersionFlag;

    this.log('Creating Package version...');
    
    if(!ignoreVersion){
        let command: string = `sf package version create --package ${packageName} --wait 10 --target-dev-hub ${devHub} --code-coverage`;
        if(installKey){
          command += ` --installation-key ${installKey}`
        }
        await exec(command)
        
    }
    
  }

  public async deployForceApp(target: string | undefined, retrieve: boolean): Promise<void> {
    // this.log('target', target);
    if(!retrieve){
      return;
    }
    if(!target){
      return;
    }
    await this.retrieveProject(target)
    .then(async () =>{
      // --concise --test-level RunLocalTests
      const localSourceDir = '../force-app';
      const commanad = `sf project deploy start --source-dir ${localSourceDir} --target-org ${target} `;
      
      await exec(commanad);

      // this.log('deployForceApp', result.stdout); const result = 
    })

    // check coverage
  }

  public async checkoutBranch(branch: string): Promise<object> {
    const result = await exec(`git checkout ${branch}`);
    this.log('checkoutBranch', result);
    return result;
  }
  
  public async retrieveProject(target: string): Promise<void> {
    this.log('Retrieving data...');
    const localSourceDir = 'C:/trailhead-org/packageTesting/force-app';

    const command = `sf project retrieve start --source-dir ${localSourceDir} --target-org ${target} `;

    await exec(command);
  }

  public async connectOrg(username: string): Promise<string | undefined> {

    const authInfo = await AuthInfo.create({ username });
    const connection = await Connection.create({ authInfo });
    this.logSuccess(`Connected to ${connection['username']}...`);

    const scratchOrgUsername = await this.createScrathOrg(connection);
    
    return scratchOrgUsername;

  }

  public async deleteScratchOrg(connection: Connection , scratchOrgIds: string[] | undefined): Promise<void> {

    let query = 'SELECT Id FROM ActiveScratchOrg ';
    let count = 0;
    if(scratchOrgIds){
      query += 'WHERE ';
      for(const id of scratchOrgIds){
        if((scratchOrgIds.length - 1) === count){
          query += `Id = '${id}' `;
        }else{
          query += `AND Id = ${id} `;
          count++;
        }
        this.log('query',query);
        
      }
      // SignupUsername: string;
      const queryActiveScrathOrgs = await connection.singleRecordQuery<{
          Id: string;
        }>(query);

       await connection.destroy('ActiveScratchOrg',queryActiveScrathOrgs.Id)
        .catch((err)=>{
          this.error('Error deleting ActiveScratchOrg ',err);
        });

    }else{
      query += 'ORDER BY CreatedDate DESC LIMIT 1';
      const queryActiveScrathOrgs = await connection.query<{
        Id: string;
      }>(query);

      for(const rec of queryActiveScrathOrgs.records){
        await connection.destroy('ActiveScratchOrg',rec.Id)
        .catch((err)=>{
          this.error('Error deleting ActiveScratchOrg ',err);
        });
      }
    }

    this.logSuccess('Scrath org deleted...');
  }

  public async getPackageAlias(sratchOrgUsername: string): Promise<string | undefined> {
    this.log('Getting package alias...');

    let aliasesSplitedList: string[] = [];
    let packageAli: string = '';
    const packageNameFlag = GeneratePackageVersion.packageNameFlag;
    const installKey = GeneratePackageVersion.installationKeyFlag;
    const pathInput = '\\sfdx-project.json';

    // TO BE REMOVED BEFORE PLUGIN LINK
    const splitedDir = process.cwd().split('\\');
    splitedDir.splice(splitedDir.length - 1, 1);
    const stringDir: string = splitedDir.join('\\');
    // TO BE REMOVED BEFORE PLUGIN LINK
    
    // process.cwd()
    this.log('process.cwd()',process.cwd());
    const filePath = path.join(stringDir , pathInput);
    this.log('filePath',filePath);

    readFile(filePath, async (error , data) => {
      if(error){return;}

      const jsonData = data.toJSON();
      const buffedData = Buffer.from(jsonData.data);
      const utf8Decoder = new TextDecoder('UTF-8');

      const decodedStr = utf8Decoder.decode(buffedData);

      const jsonFile = JSON.parse(decodedStr);

      const aliasesList = JSON.stringify(jsonFile.packageAliases).split(',');
      aliasesSplitedList = aliasesList;

      if(packageNameFlag){

        const filteredAliases = aliasesSplitedList.filter( elem => elem.includes(packageNameFlag));
        if(filteredAliases.length === 0){
          this.log('!filteredAliases');
          return undefined;
        }

        packageAli = filteredAliases[filteredAliases.length - 1].split(':')[0];

        await this.installPackageVersion(sratchOrgUsername,installKey, packageAli);
    
        
      }
    });

    return packageAli;
    
  }

  public async getScratchOrgUsername(connection: Connection): Promise<string | undefined>{
    let username = '';
    const installKey = GeneratePackageVersion.installationKeyFlag;
    const packageName = GeneratePackageVersion.packageNameFlag;

    const query: string = 'SELECT Id, SignupUsername FROM ActiveScratchOrg ORDER BY CreatedDate DESC LIMIT 1';
    const scratchOrgQuery = await connection.query<{
      Id: string;
      SignupUsername: string;
    }>(query);

    for(const record of scratchOrgQuery.records){
      username = record.SignupUsername;
      this.log('username',username);
    }
    if(!packageName){return;}
    this.log('query.records[0].SignupUsername',scratchOrgQuery.records[0].SignupUsername);
    // scratchOrgQuery.records[0].SignupUsername
    await this.createPackageVersion(connection['username'], installKey,packageName);

    return username;
  }

  public async configScratchOrg(targetOrg: string): Promise<void>{

    // TO BE REMOVED BEFORE PLUGIN LINK
    const splitedDir = process.cwd().split('\\');
    splitedDir.splice(splitedDir.length - 1, 1);
    const stringDir: string = splitedDir.join('\\');
    // TO BE REMOVED BEFORE PLUGIN LINK
    this.log('stringDir',stringDir);
    // fix dir path
    const mainOrgUsername = GeneratePackageVersion.targetOrgFlag;  
    const manifestCommand = `sf project generate manifest --from-org ${mainOrgUsername} --include-packages unlocked managed --output-dir C:/trailhead-org/packageTesting/manifest`;
    const deployCommand = `sf project deploy start --async --manifest C:/trailhead-org/packageTesting/manifest/package.xml --target-org ${targetOrg}`;


    // build query and save it in data/query.txt
    const exportCommand = `sf data export tree --query C:/trailhead-org/packageTesting/data/query.txt --plan --output-dir data --target-org ${mainOrgUsername}`;
    
    // List files previously created
    // get plan file --files Contact.json,Account.json
    const importTreeCommand = `sf data import tree --plan C:/trailhead-org/packageTesting/data/Account-Opportunity-plan.json --target-org ${targetOrg}`;

    const manifestResult = await exec(manifestCommand);
    // this.log('manifestResult',manifestResult);
    if(manifestResult.stdout.includes('success')){
      await exec(deployCommand)
      .then(async (result) => {
        this.log('deployment is running', result);
        const command = `sf org open -o ${targetOrg}`;
        await exec(command);

        const question = 'Are you ready to continue ? (Yes,No) ';

        await this.askUserInput(question)
        .then(async response => {
          if(response.includes('Y')){
            await exec(exportCommand)
            .then( async () => {
              await exec(importTreeCommand)
              .then( async () => {

                this.log('install package');
              });
            });
            this.log('response',response);
          }else if(response.includes('N')){
            process.exit(1);
          }
        });
      })
      .catch(async (error) => {
        this.log('deploy failed', error);
        // GeneratePackageVersion.openOrg(this);
        // const command = `sf org open -o ${targetOrg}`;
        // await exec(command);
      });
    }
    
    
    // .then( async (manifest) => {
    //   this.log('manifest.stdout',manifest.stdout);

    //   await exec(deployCommand)
    //   .then( async (deploy) => {
    //     this.log('deploy.stdout',deploy);
    //     // this.log('deploy.stderr',deploy.stderr);
        
    //   });
      
    // });
    

  }

  public async createScrathOrg(connection: Connection): Promise<string | undefined> {
    const ignoreScratchOrg: boolean | undefined = GeneratePackageVersion.ignoreScratchOrgFlag;
    const installKeyFlag =  GeneratePackageVersion.installationKeyFlag;
    const packageName =  GeneratePackageVersion.packageNameFlag;

    let scratchOrgUsername: string | undefined;

    this.log('Creating scratch org...');
    if(!ignoreScratchOrg){

      // create scratch org
      const org: Org = await Org.create({
      connection
      });

      // TO BE REMOVED BEFORE PLUGIN LINK
      const splitedDir = process.cwd().split('\\');
      splitedDir.splice(splitedDir.length - 1, 1);
      const stringDir: string = splitedDir.join('\\');
      // TO BE REMOVED BEFORE PLUGIN LINK

      const projectScratchDir = 'config//project-scratch-def.json';
      const fullPath = path.join(stringDir, projectScratchDir);

      readFile(fullPath, async (error, data) => {
        if(error){return;}

        const jsonData = data.toJSON();
        const buffedData = Buffer.from(jsonData.data);
        const utf8Decoder = new TextDecoder('UTF-8');

        const decodedStr = utf8Decoder.decode(buffedData);

        const jsonFile = JSON.parse(decodedStr);

        const param: ScratchOrgCreateOptions = {
          hubOrg : org,
          setDefault: false,
          orgConfig : jsonFile
        }
        const orgResult: ScratchOrgCreateResult = await scratchOrgCreate(param);

        if(!orgResult.username){return;}
        if(!packageName){return;}

        await this.configScratchOrg(orgResult.username)
        .then( async () => {
          
          // here
          // create flag to retrieve configs
          // set required flags
          // retrieve all configs from source, except the package from flag
          // deploy config
          // install package

         
          if(orgResult.username){
            const packageAlias = await this.getPackageAlias(orgResult.username);
          
            // create and install 
            await this.createPackageVersion(connection['username'], installKeyFlag, packageName);
            await this.installPackageVersion(orgResult.username,installKeyFlag,packageAlias);
            await this.runApexTests(connection)
            .then( async () => {
              await exec(`sf org open -o ${orgResult.username}`);
            });
          }
          
          
        });
        
        // const ignoreVersionFlag = GeneratePackageVersion.ignoreVersionFlag;
        // if(ignoreVersionFlag){
        //   await this.getPackageAlias(orgResult.username)
        //   .then( async alias => {
        //     if(alias)
        //     await this.installPackageVersion(orgResult.username,installKey,alias);
        //   });
        // }else if(!ignoreVersionFlag){
        //   await this.createPackageVersion('devhub', 'key','packageName', 'scratchOrgUsername');
        // }
        return scratchOrgUsername;
      });
      

    }else if(ignoreScratchOrg){

      await this.getScratchOrgUsername(connection)
      .then( async username => {
        if(!username){return;}
        await this.configScratchOrg(username);
        // await this.runApexTests(connection)
        // .then( async () => {
        //   await exec(`sf org open -o ${username}`);
        // });
      });
      
      return scratchOrgUsername;
    }
    
  }

  public async askUserInput(question: string): Promise<string> {
    let answer = '';
    const rl = input.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    await rl.question(question)
    .then(result => {
      answer = result;
      rl.close();

    });

    return answer;
    
  }

  public async run(): Promise<GeneratePackageVersionResult> {
    const { flags } = await this.parse(GeneratePackageVersion);

    GeneratePackageVersion.targetOrgFlag = flags['target-org'].getUsername();
    GeneratePackageVersion.packageNameFlag = flags['package-name'];
    GeneratePackageVersion.installationKeyFlag = flags['installation-key'];
    GeneratePackageVersion.versionNameFlag = flags['version-name'];
    GeneratePackageVersion.versionNumberFlag = flags['version-number'];
    GeneratePackageVersion.packageTypeFlag = flags['package-type'];
    GeneratePackageVersion.ignoreVersionFlag = flags['ignore-version'];
    GeneratePackageVersion.ignoreScratchOrgFlag = flags['ignore-scratch-org'];

    // await exec(`sf org open -o ${GeneratePackageVersion.targetOrgFlag}`); // scratch org
    // or set in project-scratch org-def
    // or deploy directly in package metadata adding <members>EinsteinAI</members> 
    // <name>Settings</name>

    if(GeneratePackageVersion.targetOrgFlag){
      await this.connectOrg(GeneratePackageVersion.targetOrgFlag);
    }
    
    return {
      path: 'src/commands/generate/package/version.ts',
    };
  }
}
import * as child from 'node:child_process';
import * as util from 'node:util';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
// import { execCmd } from '@salesforce/cli-plugins-testkit';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('generate-package-version', 'hello.world');
const exec = util.promisify(child.exec);

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    const time = new Date().toDateString();
    this.log(messages.getMessage('info.hello', [flags.name, time]));

    // const result = execCmd<HelloWorldResult>('config:list');
    const result = await exec('sf org open -o mindful-koala');
    this.log('result', result);
    return {
      name: flags.name,
      time,
    };
  }
}
/*
	sf package create --name "Expense Manager" --path force-app --package-type Managed
  sf package create --name salesApps --description "My Package" --package-type Unlocked --path force-app --no-namespace --target-dev-hub DevHub

--------------------------------------------------------------------------
	  
	sf generate package version
		--package Expense Manager 
		--target-org MyTestOrg1
		--installation-key test1234
  
  -retrieve project
  sf project retrieve start

  -create scratch org
	sf org create scratch --definition-file config/project-scratch-def.json --no-namespace --no-ancestors
  sf org create scratch --definition-file config/project-scratch-def.json --set-default --target-dev-hub DevHub

  -deploy force-app into scratch org

  -run tests in scratch org

  -check coverage
  

  -configure sfdx-project.json

	-create package version
	sf package version create --package "Expense Manager" --code-coverage --installation-key test1234 --wait 10
  sf package version create --package salesApps --installation-key test1234 --wait 10 --target-dev-hub DevHub --code-coverage
	
  -create other scratch org

	-install package version in new scratch org
	sf package install --package "Expense Manager@1.2.0-12" --target-org jdoe@example.com --publish-wait 6 --wait 10 --installation-key
	
	-run apex tests in scrath org
		-query for apex tests 
		-await connection.tooling.query
		
		-run tests from query 
		const result = await connection.tooling.runTestsSynchronous(request)
	
	- check results
		this.log(result);
		
--------------------------------------------------------------------------		
	sf package version promote --package "Expense Manager@1.3.0-7"
*/

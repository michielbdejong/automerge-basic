import {
  DevonianClient,
  DevonianTable,
  DevonianLens,
  DevonianIndex,
} from 'devonian';
import { SolidIssueWithoutId, SolidIssue } from './SolidIssueClient.js';
import { GithubIssueWithoutId, GithubIssue } from './GithubIssueClient.js';

export class DevonianSolidGithubBridge {
  index: DevonianIndex;
  solidIssueTable: DevonianTable<SolidIssueWithoutId, SolidIssue>;
  githubIssueTable: DevonianTable<GithubIssueWithoutId, GithubIssue>;

  constructor(
    index: DevonianIndex,
    SolidIssueClient: DevonianClient<SolidIssueWithoutId, SolidIssue>,
    GithubIssueClient: DevonianClient<GithubIssueWithoutId, GithubIssue>,
    replicaId: string,
  ) {
    this.index = index;
    this.solidIssueTable = new DevonianTable<SolidIssueWithoutId, SolidIssue>({
      client: SolidIssueClient,
      idFieldName: 'uri',
      platform: 'solid',
      replicaId
    });
    this.githubIssueTable = new DevonianTable<GithubIssueWithoutId, GithubIssue>({
      client: GithubIssueClient,
      idFieldName: 'number',
      platform: 'github',
      replicaId
    });
    new DevonianLens<SolidIssueWithoutId, GithubIssueWithoutId, SolidIssue, GithubIssue>(
      this.solidIssueTable,
      this.githubIssueTable,
  // Solid Issue fields:
  //   uri: string;
  //   author: string;
  //   title: string;
  //   created: Date;
  //   description: string;
  //   trackerIndexUri: string;
  //   commentUris: string[];

  // Github Issue fields:
  //   foreignIds: IdentifierMap;
  //   number: number | undefined;
  //   title: string;
  //   body: string;
  
      async (input: SolidIssue): Promise<GithubIssue> => {
        const ret = {
          number: this.index.convertId('issue', 'solid', input.uri, 'github') as number,
          title: input.title,
          body: input.description,
          foreignIds: input.foreignIds,
        };
        console.log('converting from Solid to Slack', input, ret);
        return ret;
      },
      async (input: GithubIssue): Promise<SolidIssue> => {
        const ret = {
          uri: this.index.convertId('issue', 'github', input.number.toString(), 'solid') as string,
          title: input.title,
          description: input.body,
          foreignIds:input.foreignIds,
        };
        console.log('converting from Slack to Solid', input, ret);
        return ret;
      },
    );
  }
}

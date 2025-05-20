import {
  DevonianClient,
  DevonianTable,
  DevonianLens,
  DevonianIndex,
} from 'devonian';
import { SolidIssue } from './SolidIssueClient.js';
import { GithubIssue } from './GithubIssueClient.js';

export class DevonianSolidGithubBridge {
  index: DevonianIndex;
  solidIssueTable: DevonianTable<SolidIssue>;
  githubIssueTable: DevonianTable<GithubIssue>;

  constructor(
    index: DevonianIndex,
    SolidIssueClient: DevonianClient<SolidIssue>,
    GithubIssueClient: DevonianClient<GithubIssue>,
  ) {
    this.index = index;
    this.solidIssueTable = new DevonianTable<SolidIssue>(
      SolidIssueClient,
    );
    this.githubIssueTable = new DevonianTable<GithubIssue>(
      GithubIssueClient,
    );
    new DevonianLens<SolidIssue, GithubIssue>(
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
  //   foreignIds: ForeignIds;
  //   number: number | undefined;
  //   title: string;
  //   body: string;
  
      (input: SolidIssue): GithubIssue => {
        const ret = {
          number: parseInt(this.index.convert('issue', 'solid', input.uri, 'github')),
          title: input.title,
          body: input.description,
          foreignIds: input.foreignIds,
        };
        console.log('converting from Solid to Slack', input, ret);
        return ret;
      },
      (input: GithubIssue): SolidIssue => {
        const ret = {
          uri: this.index.convert('issue', 'github', input.number.toString(), 'solid'),
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

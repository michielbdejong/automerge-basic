import { DevonianClient, DevonianModel } from 'devonian';

const DEFAULT_HTTP_HEADERS = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
};

const BASE_API_URL = `https://api.github.com/repos`;
const REL_API_PATH_ISSUES = `issues`;
// const REL_API_PATH_COMMENTS = `comments`;

export type GithubIssueWithoutId = DevonianModel & {
  title: string;
  body: string;
};

export type GithubIssue = GithubIssueWithoutId & {
  number: number;
};
export type GithubComment = {
  id: number;
  body: string;
  issue_url: string;
};

export type GitHubWebhookObject = {
  action: string;
  issue: GithubIssue;
  comment?: GithubComment;
  repository: object;
  sender: {
    login: string;
  };
};

export class GithubIssueClient extends DevonianClient<GithubIssueWithoutId, GithubIssue> {
  async connect(): Promise<void> {
    //   parseWebhookData(data: GitHubWebhookObject): {
    //   type: WebhookEventType;
    //   item: FetchedItem;
    // } {
    //   // console.log("parsing in client");
    //   switch (data.action) {
    //     case "opened": {
    //       return {
    //         type: WebhookEventType.Created,
    //         item: this.translateGhItem(data.issue, "issue"),
    //       };
    //     }
    //     case "closed": {
    //       return {
    //         type: WebhookEventType.Deleted,
    //         item: this.translateGhItem(data.issue, "issue"),
    //       };
    //     }
    //     case "created": {
    //       return {
    //         type: WebhookEventType.Created,
    //         item: this.translateGhItem(data.comment!, "comment"),
    //       };
    //     }
    //     case "edited": {
    //       let item: FetchedItem;
    //       if (typeof data.comment === "undefined") {
    //         item = this.translateGhItem(data.issue, "issue");
    //       } else {
    //         item = this.translateGhItem(data.comment!, "comment");
    //       }
    //       return {
    //         type: WebhookEventType.Updated,
    //         item,
    //       };
    //     }
    //     case "deleted": {
    //       let item: FetchedItem;
    //       if (typeof data.comment === "undefined") {
    //         item = this.translateGhItem(data.issue, "issue");
    //       } else {
    //         item = this.translateGhItem(data.comment!, "comment");
    //       }
    //       return {
    //         type: WebhookEventType.Deleted,
    //         item,
    //       };
    //     }
    //     default: {
    //       throw new Error('Could not parse Webhook Body!');
    //       // return {
    //       //   type: WebhookEventType.Deleted,
    //       //   item: {} as FetchedItem,
    //       // };
    //     }
    //   }
    // }
  }

  async add(obj: GithubIssueWithoutId): Promise<GithubIssue> {
    const headers = DEFAULT_HTTP_HEADERS;
    headers['Authorization'] = `Bearer ${process.env.GITHUB_BEARER_TOKEN}`;
    const fetchResult = await fetch(
      `${BASE_API_URL}/${process.env.GITHUB_REPO}/${REL_API_PATH_ISSUES}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(
          {
            title: obj.title,
            body: obj.body,
          },
          null,
          2,
        ),
      },
    );
    console.log(await fetchResult.json());
    // return fetchResult.json();
    return Object.assign(obj, { number: 42 });
  }
}

// import { Agent } from 'undici';
import { Tub } from './tub.js';
import { TrackerDrop, IssueDrop, CommentDrop } from './drops.js';
import { getFetcher } from './solid/fetcher.js';
import { fetchTracker, InterpretedTracker, InterpretedIssue, InterpretedComment } from './solid/tasks.js';
import { Lens } from './lens.js';

function renameFields(from: object, renameFields: { [from: string]: string }): object {
  return Object.keys(from)
    .filter(key => Object.keys(renameFields).includes(key))
    .reduce((obj, key) => {
      obj[renameFields[key]] = from[key];
      return obj;
    }, {});
}

class SolidTrackerLens implements Lens<InterpretedTracker, TrackerDrop> {
  forward(from: InterpretedTracker): TrackerDrop {
    return renameFields(from, {
      authorId: 'author',
      indexUri: 'localId',
      created: 'created',
      initialState: 'initialState',
      assigneeClass: 'assigneeClass',
    }) as TrackerDrop;
  }
  backward(from: TrackerDrop): InterpretedTracker {
    return renameFields(from, {
      author: 'authorId',
      localId: 'indexUri',
      created: 'created',
      initialState: 'initialState',
      assigneeClass: 'assigneeClass',
    }) as InterpretedTracker;
  }
}
class SolidIssueLens implements Lens<InterpretedIssue, IssueDrop> {
  forward(from: InterpretedIssue): IssueDrop {
    return renameFields(from, {
      uri: 'localId',
      authorId: 'author',
      created: 'created',
      initialState: 'initialState',
      assigneeClass: 'assigneeClass',
    }) as IssueDrop;
  }
  backward(from: IssueDrop): InterpretedIssue {
    return renameFields(from, {
      localId: 'uri',
      author: 'authorId',
      created: 'created',
      description: 'description',
      
    }) as InterpretedIssue;
  }
}
class SolidCommentLens implements Lens<InterpretedComment, CommentDrop> {
  forward(from: InterpretedComment): CommentDrop {
    return renameFields(from, {
      uri: 'localId',
      authorId: 'author',
      created: 'created',
      initialState: 'initialState',
      assigneeClass: 'assigneeClass',
    }) as CommentDrop;
  }
  backward(from: CommentDrop): InterpretedComment {
    return renameFields(from, {
      localId: 'uri',
      author: 'authorId',
      created: 'created',
      description: 'description',
      
    }) as InterpretedComment;
  }

}
export class SolidClient {
  fetch: typeof globalThis.fetch;
  tub: Tub;
  trackerLens: SolidTrackerLens;
  issueLens: SolidIssueLens;
  commentLens: SolidCommentLens;
  constructor(tub: Tub) {
    this.tub = tub;
    this.trackerLens = new SolidTrackerLens();
    this.issueLens = new SolidIssueLens();
    this.commentLens = new SolidCommentLens();
  }
  store(model: string, data: object) {
    console.log(model, data);
  }
  async connect() {
    this.fetch = await getFetcher();
    const data = await fetchTracker(process.env.TRACKER_IN_SOLID, this.fetch);
    this.store('tracker', data.tracker);
    // da
  }
}

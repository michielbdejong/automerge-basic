import { EventEmitter } from 'node:events';

export abstract class DevonianClient<Model> extends EventEmitter {
  abstract add(obj: Model): Promise<string>
}

export class DevonianTable<Model> extends EventEmitter {
  rows: Model[] = [];
  constructor(client: DevonianClient<Model>) {
    super();
    this.on('add', (obj: Model) => {
      client.add(obj);
    });
    client.on('add', (obj: Model) => {
      this.add(obj);
    });
  }
  async add(obj: Model): Promise<void> {
    this.rows.push(obj);
    this.emit('add', obj);
  }
};

export class DevonianLens<LeftModel, RightModel> {
  left: DevonianTable<LeftModel>;
  right: DevonianTable<RightModel>;
  constructor(left: DevonianTable<any>, right: DevonianTable<any>, leftToRight: (input: LeftModel) => RightModel, rightToLeft: (input: RightModel) => LeftModel) {
    this.left = left;
    this.right = right;
    left.on('add', (added: LeftModel) => {
      right.add(leftToRight(added));
    });
    right.on('add', (added: RightModel) => {
      left.add(rightToLeft(added));
    });
  }
}

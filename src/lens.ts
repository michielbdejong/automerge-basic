interface Lens<From, To> {
  forward(from: From): To;
  backward(to: To): From;
}

export class DateLens implements Lens<string, Date> {
  forward(s: string): Date {
    return new Date(s);
  }
  backward(d: Date): string {
    return d.toString();
  }
}
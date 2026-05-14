import { AiSource } from './event';

export class Message {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  username: string;
  avatar: string | null;
  sources?: AiSource[];

  constructor(id: number, text: string, time: string, isMe: boolean, username: string, avatar: string | null, sources?: AiSource[]) {
    this.id = id;
    this.text = text;
    this.time = time;
    this.isMe = isMe;
    this.username = username;
    this.avatar = avatar;
    this.sources = sources;
  }
}

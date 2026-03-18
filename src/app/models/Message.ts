export class Message {
  id: number;
  text: string;
  time: string;
  isMe: boolean;
  username: string;
  avatar: string | null;

  constructor(id: number, text: string, time: string, isMe: boolean, username: string, avatar: string | null) {
    this.id = id;
    this.text = text;
    this.time = time;
    this.isMe = isMe;
    this.username = username;
    this.avatar = avatar;
  }
}

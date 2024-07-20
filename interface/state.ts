import { CharacterState } from "./character";
import { Square } from "./shapes";

type UserId = string;
type CharacterId = string;

export interface User {
  color: string;
}

export interface State {
  squares: Square[];
  characters: Record<CharacterId, CharacterState>;
  users: Record<UserId, User>;
  userToCharacters: Record<UserId, CharacterId[]>;
}

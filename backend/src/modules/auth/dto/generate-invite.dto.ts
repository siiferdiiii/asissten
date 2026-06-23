import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateInviteDto {
  @IsString()
  @IsNotEmpty()
  doctorProfileId!: string;
}

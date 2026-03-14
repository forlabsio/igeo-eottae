import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsUUID()
  serviceId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}

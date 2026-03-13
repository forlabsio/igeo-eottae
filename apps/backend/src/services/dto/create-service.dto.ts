import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

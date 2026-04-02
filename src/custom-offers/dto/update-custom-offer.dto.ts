import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomOfferDto } from './create-custom-offer.dto';

export class UpdateCustomOfferDto extends PartialType(CreateCustomOfferDto) {}

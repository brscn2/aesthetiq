import { PartialType } from '@nestjs/swagger';
import { CreateWishlistItemDto } from './create-wishlist-item.dto';

export class UpdateWishlistItemDto extends PartialType(CreateWishlistItemDto) {}

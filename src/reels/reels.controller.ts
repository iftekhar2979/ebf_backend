import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthenticationGuard } from 'src/auth/guards/session-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { CreateReelDto } from './dto/create-reel.dto';
import { UpdateReelDto } from './dto/update-reel.dto';
import { ReelsService } from './reels.service';
// Import your AuthGuard here if available, assuming standard NestJS JWT strategy or similar
// import { AuthGuard } from '@nestjs/passport';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
    @UseGuards(JwtAuthenticationGuard)
  // @UseGuards(AuthGuard('jwt')) // Uncomment when auth guard is available
  create(
    @GetUser() user: User, 
    @Body() createReelDto: CreateReelDto
  ) {
    // console.log(user);
    // Fallback userId if GetUser is not providing it (e.g. testing without auth guard)
    const userId = user?.id ; 
    return this.reelsService.create(userId, createReelDto);
  }

  @Get()
  findAllPublic(@Query() query: {page: number, limit: number}) {
    return this.reelsService.findAllPublic(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reelsService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(AuthGuard('jwt'))
  @UseGuards(JwtAuthenticationGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body() updateReelDto: UpdateReelDto
  ) {
      const userId = user?.id ; 
    return this.reelsService.update(id, userId, updateReelDto);
  }

  @Delete(':id')
  // @UseGuards(AuthGuard('jwt'))
    @UseGuards(JwtAuthenticationGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User
  ) {
    const userId =user?.id
    return this.reelsService.remove(id, userId);
  }
}

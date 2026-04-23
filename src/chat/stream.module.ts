import { Module } from "@nestjs/common";
import { StreamController } from "./stream.controller";
import { StreamService } from "./stream.service";
import { GigsModule } from "src/gigs/gigs.module";


@Module({  imports: [
  GigsModule
],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
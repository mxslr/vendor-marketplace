import { Module } from "@nestjs/common";
import { StreamController } from "./stream.controller";
import { StreamService } from "./stream.service";
import { GigsModule } from "src/gigs/gigs.module";
import { AuthModule } from "src/auth/auth.module";


@Module({  imports: [
  GigsModule, AuthModule
],
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService]
})
export class StreamModule {}
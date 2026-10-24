import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./config/theme";
import { T } from "./config/timing";
import { Happy2HelpFilm } from "./Happy2HelpFilm";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Happy2HelpFilm" component={Happy2HelpFilm} durationInFrames={T.total} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);

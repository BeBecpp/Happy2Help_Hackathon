import React from "react";
import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./config/theme";
import { T } from "./config/timing";
import { Happy2HelpFilm } from "./Happy2HelpFilm";
import { Happy2HelpKeynote, KEYNOTE_TOTAL_SECONDS } from "./Keynote";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Happy2HelpKeynote" component={Happy2HelpKeynote} durationInFrames={KEYNOTE_TOTAL_SECONDS * FPS} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="Happy2HelpFilm" component={Happy2HelpFilm} durationInFrames={T.total} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);

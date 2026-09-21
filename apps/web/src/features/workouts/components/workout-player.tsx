'use client';

import styles from './workout-player.module.css';
import type { WorkoutDetail } from '@mini-workout/core/workouts';
import { HlsJsVideo } from '@videojs/react/media/hlsjs-video';
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video';
import '@videojs/react/video/skin.css';

type WorkoutPlayerProps = {
  poster: string;
  sourceType: WorkoutDetail['videoSourceType'];
  src: string;
  title: string;
};

export function WorkoutPlayer({
  poster,
  sourceType,
  src,
  title,
}: WorkoutPlayerProps) {
  return (
    <VideoPlayer poster={poster} title={title}>
      <VideoSkin className={styles.player}>
        {sourceType === 'HLS' ? (
          <HlsJsVideo
            playsInline
            preload="metadata"
            source={{ src, type: 'application/vnd.apple.mpegurl' }}
            streamType="on-demand"
          />
        ) : (
          <Video playsInline preload="metadata" src={src} />
        )}
      </VideoSkin>
    </VideoPlayer>
  );
}

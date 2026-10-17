export type CatalogType = "live" | "vod" | "series";

export type XtreamAction =
  | "get_live_categories"
  | "get_live_streams"
  | "get_vod_categories"
  | "get_vod_streams"
  | "get_vod_info"
  | "get_series_categories"
  | "get_series"
  | "get_series_info";

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  category_id: string;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_id: number;
  stream_icon: string;
  rating: string | number;
  rating_5based: number;
  category_id: string;
  container_extension: string;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  rating: string | number;
  rating_5based: number;
  category_id: string;
}

export interface XtreamVodDetailsInfo {
  movie_image?: string;
  cover_big?: string;
  tmdb_id?: string | number;
  name?: string;
  o_name?: string;
  plot?: string;
  description?: string;
  cast?: string;
  actors?: string;
  director?: string;
  genre?: string;
  releasedate?: string;
  release_date?: string;
  duration?: string;
  duration_secs?: number;
  rating?: string | number;
  country?: string;
  youtube_trailer?: string;
}

export interface XtreamVodMovieData {
  stream_id: number;
  name: string;
  added?: string;
  category_id: string;
  container_extension: string;
  custom_sid?: string;
  direct_source?: string;
}

export interface XtreamVodInfo {
  info: XtreamVodDetailsInfo;
  movie_data: XtreamVodMovieData;
}

export interface XtreamSeason {
  season_number: number;
  name: string;
  episode_count?: number | string;
  cover?: string;
  air_date?: string;
  overview?: string;
}

export interface XtreamEpisodeInfo {
  movie_image?: string;
  plot?: string;
  releasedate?: string;
  rating?: number | string;
  duration?: string;
  duration_secs?: number;
}

export interface XtreamEpisode {
  id: string;
  episode_num: number | string;
  title: string;
  container_extension: string;
  info?: XtreamEpisodeInfo;
  season?: number;
  added?: string;
}

export interface XtreamSeriesDetailsInfo {
  name?: string;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string | number;
  rating_5based?: number;
  backdrop_path?: string[];
  youtube_trailer?: string;
  episode_run_time?: string;
  category_id?: string;
}

export interface XtreamSeriesInfo {
  seasons?: XtreamSeason[];
  info: XtreamSeriesDetailsInfo;
  episodes: Record<string, XtreamEpisode[]>;
}

export interface SavedMediaItem {
  id: number;
  type: "vod" | "series";
  title: string;
  poster: string;
  rating?: string;
  addedAt: number;
}

export interface FavoriteLiveChannel {
  streamId: number;
  name: string;
  icon: string;
  categoryId: string;
  addedAt: number;
}

export interface WatchHistoryInput {
  key: string;
  mediaId: number;
  episodeId?: string;
  seasonNumber?: string;
  episodeNumber?: string | number;
  episodeTitle?: string;
  type: "vod" | "series";
  title: string;
  poster: string;
  rating?: string;
  containerExtension: string;
}

export interface WatchHistoryItem extends WatchHistoryInput {
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: number;
}

export interface StreamAudioTrack {
  index: number;
  language?: string;
  title?: string;
  codec?: string;
}

export interface StreamProbeMetadata {
  durationSeconds: number;
  videoCodec?: string;
  audioTracks: StreamAudioTrack[];
}

export interface PlayableMedia {
  title: string;
  subtitle?: string;
  type: CatalogType;
  directUrl: string;
  fallbackDirectUrl?: string;
  containerExtension?: string;
  poster?: string;
  initialTimeSeconds?: number;
  durationSeconds?: number;
  historyMetadata?: WatchHistoryInput;
}


library(reticulate)
library(av)

## input parameters
source_video <- 'C:/Users/alexa/Desktop/OVZ_prototype_captation.mp4'
resized_video <- './input_files/input_video_resized.mp4'
enriched_video <- './output/output_video_enriched.mp4'
generated_midi <- './output/stochastic_audio.midi'
generated_wav <- './output/stochastic_audio.wav'
final_output <- './output/output_video_enriched_with_sound.mp4'


## utility functions
reticulate::source_python('./code/utils.py')

## main workflow
# resize(fpath = source_video, scale_perc = 25, output_path = resized_video)

# values <- detect_skiers(resized_video, enriched_video)

values <- detect_skiers(resized_video)


generate_midi(values, generated_midi)
midi_to_wav(generated_midi, generated_wav, './input_files/Celeste.sf2')

## data viz
plot(values[,1] / 1000, round(values[,2] / max(values[,2]) * 24), pch = 15)
abline(h=0:24, col="lightgrey")

## merge audio and video
av::av_encode_video(
  enriched_video,
  output = final_output,
  framerate = 25,
  vfilter = "null",
  codec = NULL,
  audio = generated_wav,
  verbose = TRUE
)

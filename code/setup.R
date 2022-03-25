## Env set up

library(reticulate)
reticulate::py_install("opencv", pip = TRUE)
reticulate::py_install("MIDIUtil", pip = TRUE)
reticulate::py_install("midi2audio", pip = TRUE)
reticulate::py_install("python-rtmidi", pip = TRUE)

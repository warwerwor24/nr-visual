import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Stack, Text } from '@sanity/ui';
import { set, setIfMissing, unset, useClient, useFormValue, type ObjectInputProps } from 'sanity';
import type { ImageValue } from '@sanity/types';

export function VideoCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: '2025-02-19' });
  const kind = useFormValue(['kind']);
  const title = useFormValue(['title']);
  const id = useId();
  const video = useRef<HTMLVideoElement>(null);
  const mounted = useRef(true);
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function saveFrame() {
    const player = video.current;
    if (!player || !ready || player.seeking || player.readyState < 2 || busy || props.readOnly) return;
    setBusy(true);
    setError('');
    setMessage('Saving selected frame…');
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1600 / Math.max(player.videoWidth, player.videoHeight));
      canvas.width = Math.max(1, Math.round(player.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(player.videoHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Frame capture is unavailable. Upload a cover image instead.');
      context.drawImage(player, 0, 0, canvas.width, canvas.height);
      const frame = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not capture this frame. Try another time.')), 'image/jpeg', .9));
      const asset = await client.assets.upload('image', frame, { filename: `video-cover-${Math.round(time * 1000)}.jpg` });
      if (!mounted.current) return;
      const patches = [setIfMissing({ _type: 'image' }), set({ _type: 'reference', _ref: asset._id }, ['asset']), unset(['crop']), unset(['hotspot'])];
      if (!props.value?.alt && typeof title === 'string' && title.trim()) patches.push(set(`Video frame from ${title}`, ['alt']));
      props.onChange(patches);
      setMessage('Cover saved to draft. Review the image description, then Publish the project.');
    } catch (cause) {
      if (mounted.current) {
        setMessage('');
        setError(cause instanceof Error ? cause.message : 'Could not save the cover. Try again.');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return <Stack gap={4}>
    {props.renderDefault(props)}
    {kind === 'video' && !props.readOnly && <Card padding={3} border radius={2}>
      <Stack gap={3}>
        <Text size={1} weight="semibold">Choose a cover from your video</Text>
        <Text size={1}>Select the matching video from your computer. Only the selected frame is uploaded; playback still uses Google Drive.</Text>
        <label htmlFor={`${id}-file`}>Video file</label>
        <input id={`${id}-file`} type="file" accept="video/*" disabled={busy} style={{ width: '100%', minHeight: 44 }} onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          setDuration(0);
          setTime(0);
          setReady(false);
          setMessage('Reading local video…');
          setError('');
          setSource(URL.createObjectURL(file));
        }} />
        {source && <>
          <video ref={video} key={source} src={source} muted playsInline preload="auto" aria-label="Selected cover frame" style={{ display: 'block', width: '100%', maxHeight: 320, background: '#000', objectFit: 'contain' }}
            onLoadedMetadata={event => {
              const player = event.currentTarget;
              if (!Number.isFinite(player.duration) || player.duration <= 0 || !player.videoWidth || !player.videoHeight) {
                setError('This video could not be read. Try an MP4 with H.264 video, or upload a cover image.');
                setMessage('');
                return;
              }
              setDuration(player.duration);
            }}
            onLoadedData={() => { setReady(true); setMessage('Drag the timeline to choose your cover.'); }}
            onSeeking={() => setReady(false)}
            onSeeked={() => setReady(true)}
            onError={() => { setReady(false); setDuration(0); setMessage(''); setError('Your browser cannot read this video. Try an MP4 with H.264 video, or upload a cover image.'); }} />
          <label htmlFor={`${id}-time`}>Cover time: {time.toFixed(2)} seconds</label>
          <input id={`${id}-time`} type="range" min={0} max={Math.max(0, duration - .01)} step="0.01" value={time} disabled={!duration || busy} style={{ width: '100%', minHeight: 44 }} onChange={event => {
            const value = Number(event.currentTarget.value);
            setTime(value);
            if (video.current) video.current.currentTime = value;
            setMessage('Drag the timeline to choose your cover.');
          }} />
          <Button text={busy ? 'Saving cover…' : 'Use this frame as cover'} disabled={!ready || !duration || busy} style={{ minHeight: 44 }} onClick={saveFrame} />
        </>}
        <div role="status"><Text size={1}>{message}</Text></div>
        {error && <Card tone="critical" padding={3} radius={2} role="alert"><Text size={1}>{error}</Text></Card>}
      </Stack>
    </Card>}
  </Stack>;
}

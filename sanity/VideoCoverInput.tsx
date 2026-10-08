import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Select, Stack, Text } from '@sanity/ui';
import { set, setIfMissing, unset, useClient, useFormValue, type ObjectInputProps } from 'sanity';
import type { ImageValue } from '@sanity/types';
import { driveMedia } from '../src/lib/media.mjs';

export function VideoCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: '2025-02-19' });
  const kind = useFormValue(['kind']);
  const title = useFormValue(['title']);
  const documentId = useFormValue(['_id']);
  const driveUrl = useFormValue(['driveUrl']);
  const drive = driveMedia(driveUrl);
  const photoValue = useFormValue(['photos']);
  const photos = (Array.isArray(photoValue) ? photoValue : []) as (ImageValue & { _key: string; alt?: string })[];
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const albumPhoto = photos.find(photo => photo._key === selectedPhoto && photo.asset?._ref);
  const id = useId();
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const download = useRef<AbortController | null>(null);
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; download.current?.abort(); };
  }, []);
  useEffect(() => {
    download.current?.abort();
    selectVideo('', '');
  }, [documentId, driveUrl, kind, props.readOnly]);

  function selectVideo(next: string, notice: string) {
    if (!next && fileInput.current) fileInput.current.value = '';
    setDuration(0);
    setTime(0);
    setReady(false);
    setMessage(notice);
    setError('');
    setSource(next);
  }

  async function loadDriveVideo() {
    if (!drive || busy || loading || props.readOnly) return;
    const controller = new AbortController();
    download.current = controller;
    selectVideo('', 'Memuat video dari Drive. File besar membutuhkan waktu lebih lama.');
    setLoading(true);
    try {
      const token = client.config().token;
      if (!token) throw new Error('Login ke Sanity terlebih dahulu.');
      const endpoint = new URL(process.env.SANITY_STUDIO_DRIVE_VIDEO_URL || 'https://nr-visual.vercel.app/api/drive-video');
      endpoint.searchParams.set('url', drive.open);
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Layanan video belum tersedia. Coba lagi, atau pilih file dari komputer.');
      }
      // ponytail: seluruh video dimuat sebagai Blob; pakai proxy Range jika video besar membebani memori browser.
      const file = await response.blob();
      if (controller.signal.aborted || !mounted.current) return;
      if (!file.size || (!file.type.startsWith('video/') && file.type !== 'application/octet-stream')) throw new Error('Drive tidak mengirim file video yang bisa dibaca.');
      selectVideo(URL.createObjectURL(file), 'Membaca video Drive. Setelah siap, geser timeline untuk memilih frame.');
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) {
        setMessage('');
        setError(cause instanceof Error ? cause.message : 'Video gagal dimuat dari Drive.');
      }
    } finally {
      if (mounted.current && download.current === controller) {
        download.current = null;
        setLoading(false);
        if (controller.signal.aborted) setMessage('Pemuatan video dibatalkan.');
      }
    }
  }

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
      if (!mounted.current || video.current !== player) return;
      const patches = [setIfMissing({ _type: 'image' }), set({ _type: 'reference', _ref: asset._id }, ['asset']), unset(['crop']), unset(['hotspot'])];
      if (!props.value?.alt && typeof title === 'string' && title.trim()) patches.push(set(`Video frame from ${title}`, ['alt']));
      props.onChange(patches);
      setMessage('Cover saved to draft. Review the image description, then Publish the project.');
    } catch (cause) {
      if (mounted.current && video.current === player) {
        setMessage('');
        setError(cause instanceof Error ? cause.message : 'Could not save the cover. Try again.');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return <Stack gap={4}>
    {props.renderDefault(props)}
    {kind === 'photo' && !props.readOnly && <Card padding={3} border radius={2}>
      <Stack gap={3}>
        <Text size={1} weight="semibold">Pilih cover dari album</Text>
        <Text size={1}>{photos.some(photo => photo.asset?._ref) ? 'Pakai foto album tanpa upload ulang, lalu atur Crop/Hotspot untuk framing 16:9.' : 'Upload foto di tab Album foto terlebih dahulu, atau upload cover langsung di atas.'}</Text>
        <label htmlFor={`${id}-photo`}>Foto untuk cover</label>
        <Select id={`${id}-photo`} value={albumPhoto ? selectedPhoto : ''} style={{ minHeight: 44 }} onChange={event => setSelectedPhoto(event.currentTarget.value)}>
          <option value="">Pilih foto album</option>
          {photos.map((photo, index) => photo.asset?._ref && <option key={photo._key} value={photo._key}>Foto {index + 1}{photo.alt ? `: ${photo.alt}` : ' (deskripsi belum diisi)'}</option>)}
        </Select>
        <Button text="Gunakan foto ini sebagai cover" disabled={!albumPhoto} style={{ minHeight: 44 }} onClick={() => {
          if (!albumPhoto?.asset?._ref) return;
          props.onChange([
            setIfMissing({ _type: 'image' }), set(albumPhoto.asset, ['asset']), unset(['crop']), unset(['hotspot']),
            albumPhoto.alt ? set(albumPhoto.alt, ['alt']) : unset(['alt']),
          ]);
          setMessage('Cover dipilih dari album. Periksa deskripsi dan framing cover.');
        }} />
        <div role="status"><Text size={1}>{message}</Text></div>
      </Stack>
    </Card>}
    {kind === 'video' && !props.readOnly && <Card padding={3} border radius={2}>
      <Stack gap={3}>
        <Text size={1} weight="semibold">Pilih cover dari video</Text>
        <Text size={1}>{drive ? 'Muat video dari link Google Drive project ini, lalu geser timeline untuk memilih frame sendiri. Hanya gambar cover yang diupload ke Sanity.' : 'Isi Google Drive video link di tab Video terlebih dahulu, atau pilih file video dari komputer di bawah.'}</Text>
        <Button text={loading ? 'Memuat video dari Drive…' : 'Muat video dari Drive'} disabled={!drive || busy || loading} style={{ minHeight: 44 }} onClick={loadDriveVideo} />
        {loading && <Button text="Batalkan pemuatan" style={{ minHeight: 44 }} onClick={() => download.current?.abort()} />}
        <Text size={1}>Alternatif: pilih file video yang sama dari komputer.</Text>
        <label htmlFor={`${id}-file`}>Video file</label>
        <input ref={fileInput} id={`${id}-file`} type="file" accept="video/*" disabled={busy || loading} style={{ width: '100%', minHeight: 44 }} onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          selectVideo(URL.createObjectURL(file), 'Reading local video…');
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

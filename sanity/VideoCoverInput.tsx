import { useEffect, useId, useRef, useState } from 'react';
import { Button, Card, Select, Stack, Text } from '@sanity/ui';
import { set, setIfMissing, unset, useClient, useFormValue, type ObjectInputProps } from 'sanity';
import type { ImageValue } from '@sanity/types';
import { createImageUrlBuilder } from '@sanity/image-url';
import { driveMedia } from '../src/lib/media.mjs';
import { captureFrame, recommendFrames, seekFrame } from './frameRecommendations.mjs';
import { savedRecommendationFrames } from './storedCoverRecommendations.mjs';

type Candidate = { time: number; preview: string; image?: ImageValue };

export function VideoCoverInput(props: ObjectInputProps<ImageValue>) {
  const client = useClient({ apiVersion: '2025-02-19' });
  const kind = useFormValue(['kind']);
  const title = useFormValue(['title']);
  const documentId = useFormValue(['_id']);
  const driveUrl = useFormValue(['driveUrl']);
  const drive = driveMedia(driveUrl);
  const storedValue = useFormValue(['coverRecommendations']);
  const savedCandidates: Candidate[] = savedRecommendationFrames(storedValue, driveUrl).map((frame: {time: number; image: ImageValue}) => ({
    time: frame.time, image: frame.image,
    preview: createImageUrlBuilder(client).image(frame.image).width(640).height(360).fit('crop').auto('format').quality(85).url(),
  }));
  const photoValue = useFormValue(['photos']);
  const photos = (Array.isArray(photoValue) ? photoValue : []) as (ImageValue & { _key: string; alt?: string })[];
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const albumPhoto = photos.find(photo => photo._key === selectedPhoto && photo.asset?._ref);
  const id = useId();
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const download = useRef<AbortController | null>(null);
  const analysis = useRef<AbortController | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (source.startsWith('blob:')) URL.revokeObjectURL(source); }, [source]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; download.current?.abort(); analysis.current?.abort(); };
  }, []);
  useEffect(() => {
    download.current?.abort();
    setLoading(false);
    selectVideo('', '');
  }, [documentId, driveUrl, kind, props.readOnly]);

  function selectVideo(next: string, notice: string) {
    analysis.current?.abort();
    analysis.current = null;
    setAnalyzing(false);
    setCandidates([]);
    setSelectedCandidate(null);
    if (!next && fileInput.current) fileInput.current.value = '';
    setDuration(0);
    setTime(0);
    setReady(false);
    setMessage(notice);
    setError('');
    setSource(next);
  }

  function cancelDriveVideo() {
    download.current?.abort();
    selectVideo('', 'Pemuatan video dibatalkan.');
    setLoading(false);
  }

  async function loadDriveVideo() {
    if (!drive || busy || loading || analyzing || props.readOnly) return;
    const controller = new AbortController();
    download.current = controller;
    selectVideo('', 'Menyiapkan preview video dari Drive…');
    setLoading(true);
    try {
      const token = client.config().token;
      if (!token) throw new Error('Login ke Sanity terlebih dahulu.');
      const endpoint = new URL(process.env.SANITY_STUDIO_DRIVE_VIDEO_URL || 'https://nr-visual.vercel.app/api/drive-video');
      endpoint.searchParams.set('url', drive.open);
      endpoint.searchParams.set('session', '1');
      const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Layanan video belum tersedia. Coba lagi, atau pilih file dari komputer.');
      }
      const result = await response.json();
      if (controller.signal.aborted || !mounted.current) return;
      if (typeof result.ticket !== 'string') throw new Error('Sesi video gagal disiapkan. Muat video kembali.');
      endpoint.searchParams.delete('session');
      endpoint.searchParams.set('ticket', result.ticket);
      selectVideo(endpoint.href, 'Memuat bagian awal video. Kamu bisa memilih frame setelah preview siap.');
    } catch (cause) {
      if (!controller.signal.aborted && mounted.current) {
        setMessage('');
        setError(cause instanceof Error ? cause.message : 'Video gagal dimuat dari Drive.');
        setLoading(false);
      }
    } finally {
      if (mounted.current && download.current === controller) {
        download.current = null;
        if (controller.signal.aborted) setLoading(false);
      }
    }
  }

  async function findCandidates() {
    const player = video.current;
    if (!player || !ready || !duration || busy || analyzing || props.readOnly) return;
    const controller = new AbortController();
    const originalTime = player.currentTime;
    analysis.current = controller;
    const timeout = setTimeout(() => controller.abort(new Error('Analisis melewati 2 menit. Coba file lokal atau pilih frame manual.')), 120000);
    setAnalyzing(true);
    setSelectedCandidate(null);
    setError('');
    setMessage('Memeriksa frame video…');
    try {
      const result = await recommendFrames(player, controller.signal, (done: number, total: number) => {
        if (analysis.current === controller) setMessage(`Memeriksa frame ${done}/${total}…`);
      });
      if (analysis.current !== controller || !mounted.current) return;
      setCandidates(result);
      setMessage(result.length ? `${result.length} kandidat ditemukan. Klik untuk preview 16:9; cover belum berubah.` : 'Belum ada frame yang cukup terang, tajam, dan berbeda. Pilih frame manual atau upload thumbnail.');
    } catch (cause) {
      if (analysis.current === controller && mounted.current) {
        setMessage('');
        if (controller.signal.aborted && controller.signal.reason?.name === 'AbortError') setMessage('Pencarian dibatalkan. Cover belum berubah.');
        else setError(cause instanceof Error ? cause.message : 'Analisis gagal. Pilih frame manual atau upload thumbnail.');
      }
    } finally {
      clearTimeout(timeout);
      if (analysis.current === controller && mounted.current && video.current === player) {
        try { await seekFrame(player, originalTime); } catch { /* Manual seeking remains available after a stream failure. */ }
        if (analysis.current === controller && mounted.current && video.current === player) {
          analysis.current = null;
          setAnalyzing(false);
          setReady(!player.seeking && player.readyState >= 2);
        }
      }
    }
  }

  async function previewCandidate(candidate: Candidate) {
    if (analyzing || busy || props.readOnly) return;
    if (candidate.image?.asset?._ref) {
      setSelectedCandidate(candidate);
      setError('');
      setMessage('Preview kandidat tersimpan. Klik “Gunakan kandidat ini sebagai cover” untuk memilih.');
      return;
    }
    const player = video.current;
    if (!player) return;
    setSelectedCandidate(null);
    setError('');
    setTime(candidate.time);
    setReady(false);
    try {
      await seekFrame(player, candidate.time);
      if (mounted.current && !analysis.current && video.current === player && Math.abs(player.currentTime - candidate.time) < .05) {
        setSelectedCandidate(candidate);
        setReady(true);
        setMessage('Preview crop tengah 16:9. Klik “Use this frame as cover” untuk menyimpan pilihan.');
      }
    } catch (cause) {
      if (mounted.current && video.current === player) setError(cause instanceof Error ? cause.message : 'Preview gagal dimuat.');
    }
  }

  function applyCover(asset: NonNullable<ImageValue['asset']>) {
    const patches = [setIfMissing({ _type: 'image' }), set(asset, ['asset']), unset(['crop']), unset(['hotspot'])];
    if (!props.value?.alt && typeof title === 'string' && title.trim()) patches.push(set(`Video frame from ${title}`, ['alt']));
    props.onChange(patches);
  }

  function useSavedCandidate() {
    const asset = selectedCandidate?.image?.asset;
    if (!asset?._ref || busy || analyzing || props.readOnly || !savedCandidates.some(candidate => candidate.image?.asset?._ref === asset._ref)) return;
    applyCover(asset);
    setMessage('Cover pilihan disimpan ke draft. Periksa framing dan deskripsi sebelum Publish.');
  }

  async function saveFrame() {
    const player = video.current;
    if (!player || !ready || player.seeking || player.readyState < 2 || busy || analyzing || props.readOnly) return;
    setBusy(true);
    setError('');
    setMessage('Saving selected frame…');
    try {
      const frame = await captureFrame(player);
      const asset = await client.assets.upload('image', frame, { filename: `video-cover-${Math.round(time * 1000)}.jpg` });
      if (!mounted.current || video.current !== player) return;
      applyCover({ _type: 'reference', _ref: asset._id });
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

  const visibleCandidates = source ? candidates : savedCandidates;
  const candidateChoices = !!visibleCandidates.length && <Stack gap={3}>
    {!source && <>
      <Text size={1} weight="semibold">Rekomendasi siap dipilih</Text>
      <Text size={1}>{savedCandidates.length} kandidat tersimpan. Klik untuk preview crop 16:9, lalu gunakan sebagai cover tanpa memuat video.</Text>
    </>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
      {visibleCandidates.map((candidate, index) => <Button key={candidate.time} mode="ghost" tone={selectedCandidate?.time === candidate.time ? 'primary' : 'default'} aria-pressed={selectedCandidate?.time === candidate.time} aria-label={`Preview kandidat ${index + 1}, ${candidate.time.toFixed(2)} detik`} disabled={busy || analyzing} style={{ minHeight: 44, minWidth: 0 }} onClick={() => previewCandidate(candidate)}>
        <Stack gap={2}>
          <img src={candidate.preview} alt="" style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
          <Text size={1}>Kandidat {index + 1} · {candidate.time.toFixed(2)} dtk{selectedCandidate?.time === candidate.time ? ' · Dipilih' : ''}</Text>
        </Stack>
      </Button>)}
    </div>
    {selectedCandidate && <Stack gap={2}>
      <Text size={1}>Preview cover WORK 16:9 (crop tengah)</Text>
      <img src={selectedCandidate.preview} alt={`Preview cover pada ${selectedCandidate.time.toFixed(2)} detik`} style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }} />
      {selectedCandidate.image && <Button text="Gunakan kandidat ini sebagai cover" disabled={busy || analyzing} style={{ minHeight: 44 }} onClick={useSavedCandidate} />}
    </Stack>}
  </Stack>;

  return <Stack gap={4}>
    {kind === 'video' && <Card padding={3} radius={2}><Text size={1}>Upload thumbnail JPG/PNG di bawah, atau pilih frame video secara manual maupun dari rekomendasi.</Text></Card>}
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
        <Text size={1}>{drive ? 'Pilih kandidat tersimpan, atau muat video dari Drive untuk mencari rekomendasi baru dan memilih frame manual. Video tetap di Drive.' : 'Isi Google Drive video link di tab Video terlebih dahulu, atau pilih file video dari komputer di bawah.'}</Text>
        {!source && candidateChoices}
        <Button text={loading ? 'Memuat video dari Drive…' : 'Muat video dari Drive'} disabled={!drive || busy || loading || analyzing} style={{ minHeight: 44 }} onClick={loadDriveVideo} />
        {loading && <Button text="Batalkan pemuatan" style={{ minHeight: 44 }} onClick={cancelDriveVideo} />}
        <Text size={1}>Alternatif: pilih file video yang sama dari komputer.</Text>
        <label htmlFor={`${id}-file`}>Video file</label>
        <input ref={fileInput} id={`${id}-file`} type="file" accept="video/*" disabled={busy || loading || analyzing} style={{ width: '100%', minHeight: 44 }} onChange={event => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          selectVideo(URL.createObjectURL(file), 'Reading local video…');
        }} />
        {source && <>
          <video ref={video} key={source} src={source} crossOrigin="anonymous" muted playsInline preload="metadata" aria-label="Selected cover frame" style={{ display: 'block', width: '100%', maxHeight: 320, background: '#000', objectFit: 'contain' }}
            onLoadedMetadata={event => {
              const player = event.currentTarget;
              if (!Number.isFinite(player.duration) || player.duration <= 0 || !player.videoWidth || !player.videoHeight) {
                setError('This video could not be read. Try an MP4 with H.264 video, or upload a cover image.');
                setMessage('');
                setLoading(false);
                return;
              }
              setDuration(player.duration);
            }}
            onLoadedData={() => { if (analysis.current) return; setReady(true); setLoading(false); setMessage('Drag the timeline to choose your cover.'); }}
            onSeeking={() => { setReady(false); if (!analysis.current) setMessage('Memuat frame yang kamu pilih…'); }}
            onSeeked={event => { if (analysis.current) return; setReady(event.currentTarget.readyState >= 2); setMessage('Drag the timeline to choose your cover.'); }}
            onError={() => { analysis.current?.abort(); setReady(false); setDuration(0); setLoading(false); setMessage(''); setError(source.startsWith('blob:') ? 'Your browser cannot read this video. Try an MP4 with H.264 video, or upload a cover image.' : 'Video Drive gagal dimuat. Muat kembali jika sesi sudah lewat 30 menit. Periksa izin download Drive, atau pilih file dari komputer.'); }} />
          <Text size={1} weight="semibold">Frame rekomendasi</Text>
          <Text size={1}>Dinilai dari ketajaman, pencahayaan, detail crop tengah 16:9, dan perubahan antarframe. Maksimal 6 kandidat berbeda; momen terbaik tetap kamu yang pilih.</Text>
          <Button text={analyzing ? 'Memeriksa frame…' : 'Cari frame rekomendasi'} disabled={!ready || !duration || busy || analyzing} style={{ minHeight: 44 }} onClick={findCandidates} />
          {analyzing && <Button text="Batalkan pencarian" style={{ minHeight: 44 }} onClick={() => analysis.current?.abort()} />}
          {candidateChoices}
          <label htmlFor={`${id}-time`}>Cover time: {time.toFixed(2)} seconds</label>
          <input id={`${id}-time`} type="range" min={0} max={Math.max(0, duration - .01)} step="0.01" value={time} disabled={!duration || busy || analyzing} style={{ width: '100%', minHeight: 44 }} onChange={event => {
            setSelectedCandidate(null);
            const value = Number(event.currentTarget.value);
            setTime(value);
            if (video.current) video.current.currentTime = value;
            setMessage('Drag the timeline to choose your cover.');
          }} />
          <Button text={busy ? 'Saving cover…' : 'Use this frame as cover'} disabled={!ready || !duration || busy || analyzing} style={{ minHeight: 44 }} onClick={saveFrame} />
        </>}
        <div role="status"><Text size={1}>{message}</Text></div>
        {error && <Card tone="critical" padding={3} radius={2} role="alert"><Text size={1}>{error}</Text></Card>}
      </Stack>
    </Card>}
  </Stack>;
}

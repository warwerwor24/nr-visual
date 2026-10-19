import { useEffect, useRef, useState } from 'react';
import { Button, Card, Checkbox, Flex, Stack, Text } from '@sanity/ui';
import { insert, setIfMissing, unset, useClient, type ArrayOfObjectsInputProps } from 'sanity';
import type { ImageValue } from '@sanity/types';
import { createImageUrlBuilder } from '@sanity/image-url';

type Photo = ImageValue & { _key: string; alt?: string };

export function PhotoAlbumInput(props: ArrayOfObjectsInputProps<Photo>) {
  const photos = props.value || [];
  const client = useClient({ apiVersion: '2025-02-19' });
  const builder = createImageUrlBuilder(client);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const latestPhotos = useRef(photos);
  latestPhotos.current = photos;
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selected = selection.filter(key => photos.some(photo => photo._key === key));
  const uploading = photos.filter(photo => photo._upload).length;
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function thumbnail(photo: Photo) {
    try { return builder.image(photo).width(320).fit('max').auto('format').quality(85).url(); }
    catch { return ''; }
  }

  return <Stack gap={4}>
    <Card padding={3} border radius={2} tone={photos.length > 20 ? 'critical' : 'default'}>
      <Stack gap={3}>
        <Text size={2} weight="semibold">{photos.length}/20 foto</Text>
        <Text size={1}>{selecting ? 'Centang foto yang ingin dikeluarkan. Klik Selesai memilih untuk kembali ke editor album.' : photos.length ? 'Geser thumbnail untuk mengatur urutan. Klik foto untuk preview dan mengisi deskripsi aksesibilitas.' : 'Album masih kosong. Upload beberapa foto sekaligus atau pilih gambar yang sudah ada di Sanity.'}</Text>
        <Text size={1}>Foto asli 5 MB boleh diupload. Website memakai versi gambar yang diperkecil saat ditampilkan.</Text>
        {photos.length > 20 && <Text size={1}>Album melebihi 20 foto. Keluarkan sebagian foto sebelum publish.</Text>}
      </Stack>
    </Card>
    {!props.readOnly && <Flex gap={2} wrap="wrap">
      <input ref={fileInput} type="file" multiple accept="image/*" aria-label="Upload foto sekaligus" hidden disabled={busy || !!uploading || photos.length >= 20} onChange={async event => {
        const files = Array.from(event.currentTarget.files || []).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
        event.currentTarget.value = '';
        setError('');
        if (!files.length || props.readOnly || busy || uploading) return;
        if (files.length + photos.length > 20) {
          setError(`Tersisa ${Math.max(0, 20 - photos.length)} slot. Pilih lebih sedikit foto; belum ada file baru yang diupload.`);
          return;
        }
        if (files.some(file => !file.type.startsWith('image/'))) {
          setError('Ada file yang tidak didukung. Pilih file gambar yang bisa dibaca Sanity.');
          return;
        }
        setBusy(true);
        setSelecting(false);
        const failed: string[] = [];
        let saved = 0;
        try {
          for (const file of files) {
            if (!mounted.current) return;
            if (latestPhotos.current.length >= 20) {
              failed.push(file.name);
              continue;
            }
            setMessage(`Mengupload ${saved + failed.length + 1}/${files.length}: ${file.name}`);
            try {
              const asset = await client.assets.upload('image', file, { filename: file.name });
              if (!mounted.current) return;
              if (latestPhotos.current.length >= 20) {
                failed.push(file.name);
                continue;
              }
              const photo: Photo = { _type: 'image', _key: crypto.randomUUID(), asset: { _type: 'reference', _ref: asset._id } };
              props.onChange([setIfMissing([]), insert([photo], 'after', [-1])]);
              latestPhotos.current = [...latestPhotos.current, photo];
              saved++;
            } catch {
              failed.push(file.name);
            }
          }
          setMessage(`${saved} foto ditambahkan sesuai urutan nama file. Isi deskripsi aksesibilitas sebelum publish.`);
          if (failed.length) setError(`Foto yang belum masuk album: ${failed.join(', ')}. Foto yang berhasil dan album lama tetap tersimpan. Coba upload ulang hanya file ini; periksa juga batas 20 foto.`);
        } finally {
          if (mounted.current) setBusy(false);
        }
      }} />
      <Button text={busy ? 'Sedang mengupload foto' : 'Upload foto sekaligus'} disabled={photos.length >= 20 || !!uploading || busy} style={{ minHeight: 44 }} onClick={() => fileInput.current?.click()} />
      {photos.length > 0 && <Button text={selecting ? 'Selesai memilih' : 'Pilih beberapa foto'} mode="ghost" disabled={!!uploading || busy} style={{ minHeight: 44 }} onClick={() => {
        setSelecting(!selecting);
        setSelection([]);
        setConfirming(false);
      }} />}
    </Flex>}
    {selecting && !props.readOnly && photos.length > 0 && <Flex gap={2} wrap="wrap">
      <Button text={selected.length === photos.length ? 'Batalkan pilihan' : 'Pilih semua'} mode="ghost" style={{ minHeight: 44 }} onClick={() => {
        setSelection(selected.length === photos.length ? [] : photos.map(photo => photo._key));
        setConfirming(false);
      }} />
      <Button text={`Keluarkan ${selected.length} foto dari album`} tone="critical" mode="ghost" disabled={!selected.length} style={{ minHeight: 44 }} onClick={() => setConfirming(true)} />
    </Flex>}
    {confirming && !props.readOnly && selected.length > 0 && <Card padding={3} border radius={2} tone="caution">
      <Stack gap={3}>
        <Text size={1}>Keluarkan {selected.length} foto yang dipilih? File asli di Sanity dan cover project tetap tersimpan.</Text>
        <Flex gap={2} wrap="wrap">
          <Button text="Ya, keluarkan foto" tone="critical" style={{ minHeight: 44 }} onClick={() => {
            props.onChange(selected.map(_key => unset([{ _key }])));
            setMessage(`${selected.length} foto dikeluarkan dari album.`);
            setSelection([]);
            setConfirming(false);
            setSelecting(false);
          }} />
          <Button text="Batal" mode="ghost" style={{ minHeight: 44 }} onClick={() => setConfirming(false)} />
        </Flex>
      </Stack>
    </Card>}
    <div role="status" style={{ overflowWrap: 'anywhere' }}><Text size={1}>{uploading ? `Sedang mengupload ${uploading} foto. Tunggu sampai selesai.` : message}</Text></div>
    {error && <Card padding={3} tone="critical" radius={2} role="alert" style={{ overflowWrap: 'anywhere' }}><Text size={1}>{error}</Text></Card>}
    {selecting && !props.readOnly ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
      {photos.map((photo, index) => <Card key={photo._key} as="label" border padding={2} radius={2} style={{ minHeight: 44, cursor: 'pointer', position: 'relative' }}>
        <Stack gap={2}>
          <Flex align="center" gap={2} padding={2}>
            <Checkbox checked={selected.includes(photo._key)} aria-label={`Pilih foto ${index + 1}`} onChange={event => {
              const key = photo._key;
              const checked = event.currentTarget.checked;
              setSelection(keys => checked ? [...keys.filter(value => value !== key), key] : keys.filter(value => value !== key));
              setConfirming(false);
            }} />
            <Text size={1}>Foto {index + 1}</Text>
          </Flex>
          {thumbnail(photo) ? <div>
            <img src={thumbnail(photo)} alt={photo.alt || ''} loading="lazy" style={{ display: 'block', width: '100%', aspectRatio: '4/3', objectFit: 'contain' }} onError={event => {
              event.currentTarget.hidden = true;
              event.currentTarget.style.display = 'none';
              (event.currentTarget.nextElementSibling as HTMLElement).hidden = false;
            }} />
            <span hidden>Preview tidak tersedia.</span>
          </div> : <Text size={1}>Preview belum tersedia.</Text>}
        </Stack>
      </Card>)}
    </div> : props.renderDefault({ ...props, readOnly: props.readOnly || busy })}
  </Stack>;
}

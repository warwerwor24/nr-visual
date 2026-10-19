import { Button, Stack } from '@sanity/ui';
import { set, useFormValue, type ObjectInputProps } from 'sanity';
import type { ImageValue } from '@sanity/types';

export function GalleryCoverInput(props: ObjectInputProps<ImageValue>) {
  const cover = useFormValue(['cover']) as ImageValue | undefined;
  return <Stack gap={3}>
    {props.renderDefault(props)}
    {!props.readOnly && <Button text="Use WORK cover image" disabled={!cover?.asset?._ref} style={{ minHeight: 44 }}
      onClick={() => props.onChange(set({ _type: 'image', asset: cover!.asset, alt: cover!.alt }))} />}
  </Stack>;
}

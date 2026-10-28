import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Combobox } from '@/components/combobox';
import { OtpInput } from '@/components/otp-input';
import { TimePicker } from '@/components/time-picker';
import { DateTimePicker } from '@/components/date-time-picker';
import { PhoneInput } from '@/components/phone-input';
import { ColorPicker } from '@/components/color-picker';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import '@/styles/globals.css';
const options = [
  { value: 'ath', label: 'Athens', keywords: ['hellas'] },
  { value: 'ber', label: 'Berlin' },
  { value: 'rom', label: 'Rome', disabled: true },
];
function App() {
  const [otp, setOtp] = useState('');
  const [complete, setComplete] = useState('');
  const [native, setNative] = useState(0);
  const [city, setCity] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');
  const [phone, setPhone] = useState('');
  const [parsed, setParsed] = useState('');
  const [color, setColor] = useState('#1565C0FF');
  return (
    <main style={{ maxWidth: 560, padding: 24, margin: 'auto' }}>
      <h1>Input verification</h1>
      <form
        style={{ display: 'grid', gap: 24, minWidth: 0, overflowWrap: 'anywhere' }}
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(JSON.stringify([...new FormData(event.currentTarget)]));
        }}
      >
        <Field id="destination" label="Destination" helpText="Pick one city">
          <Combobox options={options} value={city} onValueChange={setCity} name="city" />
        </Field>
        <Combobox
          label="Remote destination"
          options={loading ? [] : options}
          inputValue={query}
          onInputValueChange={setQuery}
          filterOptions={false}
          loading={loading}
        />
        <Button emphasis="secondary" onClick={() => setLoading(false)}>
          Deliver results
        </Button>
        <Combobox
          label="Guarded city"
          options={options}
          defaultValue="ath"
          name="guarded-city"
          onValueChange={(value, details) => {
            details.cancel();
            setCancelled(`${value}:${details.reason}:${details.isCanceled}`);
          }}
        />
        <output aria-label="Cancelled selection">{cancelled}</output>
        <Field id="otp" label="Code" helpText="Six digits">
          <OtpInput
            name="code"
            value={otp}
            onValueChange={setOtp}
            onComplete={setComplete}
            onChange={() => setNative((n) => n + 1)}
          />
        </Field>
        <output aria-label="Completed">{complete}</output>
        <output aria-label="Native changes">{native}</output>
        <Button emphasis="secondary" onClick={() => setOtp('')}>
          Reset code
        </Button>
        <OtpInput label="Alphanumeric code" mode="alphanumeric" length={4} />
        <OtpInput label="Locked code" readOnly defaultValue="123456" />
        <TimePicker label="Opening time" name="time" min="08:00" max="18:00" defaultValue="09:30" />
        <DateTimePicker
          label="Appointment"
          name="appointment"
          defaultValue="2027-04-12T09:30"
          timeZone="Europe/Athens"
        />
        <Field id="phone" label="Telephone" helpText="Raw phone draft">
          <PhoneInput
            name="phone"
            value={phone}
            onValueChange={setPhone}
            countries={['US', 'GB']}
            onValueCommit={(result) => setParsed(JSON.stringify(result))}
          />
        </Field>
        <output aria-label="Phone candidate">{parsed}</output>
        <PhoneInput
          label="Normalized telephone"
          defaultValue="2025550123"
          countries={['US', 'GB']}
          formatOnBlur
        />
        <Field id="brand" label="Brand color" helpText="Pick a color">
          <ColorPicker
            name="color"
            value={color}
            onValueChange={setColor}
            alpha
            swatches={[
              { value: '#1565C0', label: 'Blue' },
              { value: '#7B1FA2', label: 'Purple' },
            ]}
          />
        </Field>
        <output aria-label="Committed color">{color}</output>
        <Button emphasis="secondary" type="submit">
          Submit inputs
        </Button>
        <output aria-label="Form data">{saved}</output>
      </form>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<App />);

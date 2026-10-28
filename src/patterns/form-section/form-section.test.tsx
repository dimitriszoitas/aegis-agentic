import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormSection } from './form-section';

describe('FormSection native semantics', () => {
  it('keeps one host form with a named disabled fieldset and actions inside it', () => {
    const markup = renderToStaticMarkup(
      <form>
        <FormSection legend="Contact" disabled actions={<button type="submit">Save</button>}>
          <input name="contact" defaultValue="Draft" />
        </FormSection>
      </form>,
    );
    expect(markup.match(/<form\b/g)).toHaveLength(1);
    expect(markup).toContain('<fieldset disabled=""');
    expect(markup).toContain('>Contact</legend>');
    expect(markup.indexOf('type="submit"')).toBeLessThan(markup.indexOf('</fieldset>'));
    expect(markup).toContain('name="contact"');
  });
  it('merges a unique description id with caller context and delegates grid constraints', () => {
    const markup = renderToStaticMarkup(
      <FormSection
        legend="Details"
        description="Helpful context"
        aria-describedby="external-help"
        maxColumns={2}
      >
        <input aria-label="Name" />
      </FormSection>,
    );
    const descriptionId = markup.match(/id="(aegis-form-section-description-[^"]+)"/)?.[1];
    expect(descriptionId).toBeTruthy();
    expect(markup).toContain(`aria-describedby="external-help ${descriptionId}"`);
    expect(markup).toContain('data-max-columns="2"');
    expect(() =>
      renderToStaticMarkup(
        <FormSection legend="Invalid" maxColumns={5 as 2}>
          Fields
        </FormSection>,
      ),
    ).toThrow(/maxColumns/);
  });
});

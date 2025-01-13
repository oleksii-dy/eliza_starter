import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

export async function parseFilingContent(content: string, isXBRL: boolean, isInlineXBRL: boolean) {
    // Regular HTML filing
    if (!isXBRL && !isInlineXBRL) {
        return { type: 'html', content };
    }

    // Pure XBRL
    if (isXBRL && !isInlineXBRL) {
        try {
            const result = await parseXml(content, {
                explicitArray: false,
                ignoreAttrs: false,
                mergeAttrs: true
            });

            return {
                type: 'xbrl',
                contexts: result['xbrl']['context'] || {},
                facts: Object.entries(result['xbrl'])
                    .filter(([key]) => key.includes(':'))
                    .reduce((acc, [key, value]) => {
                        acc[key] = value;
                        return acc;
                    }, {} as Record<string, any>)
            };
        } catch (error) {
            console.error('Error parsing XBRL:', error);
            throw error;
        }
    }

    // Inline XBRL
    if (isInlineXBRL) {
        const $ = cheerio.load(content);
        const facts: Record<string, any> = {};

        $('ix\\:nonfraction').each((_, el) => {
            const element = $(el);
            const name = element.attr('name');
            const value = element.text().trim();
            
            if (name) {
                facts[name] = {
                    value,
                    contextRef: element.attr('contextref'),
                    unitRef: element.attr('unitref'),
                    format: element.attr('format'),
                    scale: element.attr('scale'),
                    rawValue: element.attr('value') || value
                };
            }
        });

        const contexts: Record<string, any> = {};
        $('xbrli\\:context').each((_, el) => {
            const element = $(el);
            const id = element.attr('id');
            if (id) {
                contexts[id] = {
                    period: element.find('xbrli\\:period').text().trim(),
                    instant: element.find('xbrli\\:instant').text().trim(),
                    startDate: element.find('xbrli\\:startdate').text().trim(),
                    endDate: element.find('xbrli\\:enddate').text().trim(),
                    entity: element.find('xbrli\\:identifier').text().trim()
                };
            }
        });

        return {
            type: 'ixbrl',
            facts,
            contexts,
            hidden: $('ix\\:hidden').html()
        };
    }

    throw new Error('Unsupported document format');
}

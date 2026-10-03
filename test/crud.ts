import { baseUrl } from './helpers';

export const mk = (res: string) => {
    const call = (m: string, p: string, body?: unknown) =>
        fetch(`${baseUrl()}/api/${res}${p}`, {
            method: m,
            headers: { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    return { get: (p = '') => call('GET', p), send: call };
};

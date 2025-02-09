import { createClient } from '@supabase/supabase-js'
import { IListing } from './api'

if (!process.env.TWAS_SUPABASE_URL || !process.env.TWAS_SUPABASE_SERVICE_ROLE) {
    console.error('TWAS_SUPABASE_URL or TWAS_SUPABASE_SERVICE_ROLE is not set')
    throw new Error('TWAS_SUPABASE_URL or TWAS_SUPABASE_SERVICE_ROLE is not set')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(process.env.TWAS_SUPABASE_URL, process.env.TWAS_SUPABASE_SERVICE_ROLE)

export async function updateListing(id: string, updatedListing: any) {
    const { data, error } = await supabase
        .from('listings')
        .update(updatedListing)
        .eq('id', id)
        .select()

    if (error) {
        throw error
    }

    return data
}

export async function createListing(listing: IListing): Promise<IListing> {
    const { data, error } = await supabase
        .from('listings')
        .insert(listing)
        .select()

    if (error) {
        throw error
    }

    console.log('inserted listing', data)

    return data[0] as any as IListing
}

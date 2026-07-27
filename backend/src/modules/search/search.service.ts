import { Injectable, Inject, OnModuleInit, NotFoundException } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import { MEILISEARCH } from './meilisearch.provider';
import { DRIZZLE } from '../../database/database.module';
import { listings } from '../../database/schema';
import { eq } from 'drizzle-orm';

export interface SearchableListing {
  id: string;
  name: string;
  description: string;
  category: string;
  listingType: string;
  askingPrice: number | null;
  monthlyRevenue: number | null;
  status: string;
  sellerId: string;
  createdAt: Date;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly listingsIndex = 'listings';

  constructor(
    @Inject(MEILISEARCH) private meilisearch: MeiliSearch,
    @Inject(DRIZZLE) private db: any,
  ) {}

  async onModuleInit() {
    try {
      await this.meilisearch.createIndex(this.listingsIndex, { primaryKey: 'id' });
      
      const index = this.meilisearch.index(this.listingsIndex);
      
      await index.updateSearchableAttributes([
        'name',
        'description',
        'category',
      ]);
      
      await index.updateFilterableAttributes([
        'category',
        'listingType',
        'status',
        'askingPrice',
        'monthlyRevenue',
      ]);
      
      await index.updateSortableAttributes([
        'askingPrice',
        'monthlyRevenue',
        'createdAt',
      ]);
      
      console.log('Meilisearch index configured successfully');
    } catch (error) {
      console.log('Meilisearch index already exists or error:', error.message);
    }
  }

  async indexListing(listing: SearchableListing): Promise<void> {
    const index = this.meilisearch.index(this.listingsIndex);
    await index.addDocuments([listing], { primaryKey: 'id' });
  }

  async indexListings(listings: SearchableListing[]): Promise<void> {
    const index = this.meilisearch.index(this.listingsIndex);
    await index.addDocuments(listings, { primaryKey: 'id' });
  }

  async deleteListing(id: string): Promise<void> {
    const index = this.meilisearch.index(this.listingsIndex);
    await index.deleteDocument(id);
  }

  async reindexListingById(id: string): Promise<void> {
    const [row] = await this.db
      .select()
      .from(listings)
      .where(eq(listings.id, id));

    if (!row) {
      throw new NotFoundException(`Listing with ID ${id} not found`);
    }

    await this.indexListing({
      id: row.id,
      name: row.name,
      description: row.longDescription || row.shortDescription || '',
      category: row.category || '',
      listingType: row.listingType || 'sale',
      askingPrice: row.askingPrice ? parseFloat(row.askingPrice) : null,
      monthlyRevenue: row.monthlyRevenue ? parseFloat(row.monthlyRevenue) : null,
      status: row.status,
      sellerId: row.sellerId,
      createdAt: row.createdAt,
    });
  }

  async searchListings(
    query: string,
    options?: {
      category?: string;
      listingType?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    const index = this.meilisearch.index(this.listingsIndex);
    
    const filter: string[] = [];
    
    if (options?.category) {
      filter.push(`category = "${options.category}"`);
    }
    if (options?.listingType) {
      filter.push(`listingType = "${options.listingType}"`);
    }
    if (options?.minPrice !== undefined) {
      filter.push(`askingPrice >= ${options.minPrice}`);
    }
    if (options?.maxPrice !== undefined) {
      filter.push(`askingPrice <= ${options.maxPrice}`);
    }

    const searchParams: any = {
      filter: filter.length > 0 ? filter : undefined,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    };

    const results = await index.search(query, searchParams);
    
    return {
      hits: results.hits,
      total: results.estimatedTotalHits || 0,
      limit: searchParams.limit,
      offset: searchParams.offset,
      query: results.query,
    };
  }
}
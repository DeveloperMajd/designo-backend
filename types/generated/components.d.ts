import type { Schema, Attribute } from '@strapi/strapi';

export interface ComponentsContactForm extends Schema.Component {
  collectionName: 'components_components_contact_forms';
  info: {
    displayName: 'ContactForm';
    icon: 'apps';
  };
  attributes: {
    Title: Attribute.String;
    Content: Attribute.Text;
  };
}

export interface ComponentsContactShowCase extends Schema.Component {
  collectionName: 'components_components_contact_show_cases';
  info: {
    displayName: 'ContactShowCase';
    icon: 'discuss';
    description: '';
  };
  attributes: {
    Title: Attribute.String;
    Content: Attribute.Text;
  };
}

export interface ComponentsHomepageBanner extends Schema.Component {
  collectionName: 'components_blocks_homepage_banners';
  info: {
    displayName: 'HomepageBanner';
    icon: 'chartPie';
    description: '';
  };
  attributes: {
    headline: Attribute.String;
    image: Attribute.Media;
    link: Attribute.Component<'custom-types.link'>;
    text: Attribute.Text;
  };
}

export interface ComponentsInfoHighlights extends Schema.Component {
  collectionName: 'components_components_info_highlights';
  info: {
    displayName: 'InfoHighlights';
    icon: 'chartBubble';
    description: '';
  };
  attributes: {
    Elements: Attribute.Component<'custom-types.info-highlight', true>;
  };
}

export interface ComponentsLocationsHighlights extends Schema.Component {
  collectionName: 'components_components_locations_highlights';
  info: {
    displayName: 'LocationsHighlights';
    icon: 'apps';
    description: '';
  };
  attributes: {
    Elements: Attribute.Component<'custom-types.locations-highlight', true> &
      Attribute.SetMinMax<
        {
          min: 0;
          max: 3;
        },
        number
      >;
  };
}

export interface ComponentsPageBanner extends Schema.Component {
  collectionName: 'components_components_page_banners';
  info: {
    displayName: 'PageBanner';
    icon: 'expand';
  };
  attributes: {
    Title: Attribute.String;
    Content: Attribute.Text;
  };
}

export interface ComponentsProjectGrids extends Schema.Component {
  collectionName: 'components_components_project_grids';
  info: {
    displayName: 'ProjectGrids';
    icon: 'grid';
    description: '';
  };
  attributes: {
    Elements: Attribute.Component<'components.projects-grid', true> &
      Attribute.SetMinMax<
        {
          max: 3;
        },
        number
      >;
    Type: Attribute.Enumeration<['two-grid', 'three-grid']> &
      Attribute.Required &
      Attribute.DefaultTo<'three-grid'>;
  };
}

export interface ComponentsProjectsCards extends Schema.Component {
  collectionName: 'components_components_projects_cards';
  info: {
    displayName: 'ProjectsCards';
    icon: 'archive';
    description: '';
  };
  attributes: {
    Title: Attribute.String;
    Content: Attribute.Text;
    Image: Attribute.Media;
    Link: Attribute.Component<'custom-types.link'>;
  };
}

export interface ComponentsProjectsGrid extends Schema.Component {
  collectionName: 'components_components_projects_grids';
  info: {
    displayName: 'ProjectsGrid';
    icon: 'apps';
    description: '';
  };
  attributes: {
    Title: Attribute.String;
    Image: Attribute.Media;
    ImageMobile: Attribute.Media;
    ImageTablet: Attribute.Media;
    page: Attribute.Relation<
      'components.projects-grid',
      'oneToOne',
      'api::page.page'
    >;
  };
}

export interface ComponentsTextMediaBanner extends Schema.Component {
  collectionName: 'components_components_text_media_banners';
  info: {
    displayName: 'TextMediaBanner';
    icon: 'apps';
    description: '';
  };
  attributes: {
    Title: Attribute.String;
    Content: Attribute.Text;
    Image: Attribute.Media;
    ImageMobile: Attribute.Media;
    ImageTablet: Attribute.Media;
  };
}

export interface ComponentsTextMedia extends Schema.Component {
  collectionName: 'components_components_text_medias';
  info: {
    displayName: 'TextMedia';
    icon: 'apps';
    description: '';
  };
  attributes: {
    Tilte: Attribute.String;
    Content: Attribute.Text;
    Image: Attribute.Media;
    ImageMobile: Attribute.Media;
    ImageTablet: Attribute.Media;
    Position: Attribute.Enumeration<['img-left', 'img-right']>;
  };
}

export interface CustomTypesInfoHighlight extends Schema.Component {
  collectionName: 'components_custom_types_info_highlights';
  info: {
    displayName: 'InfoHighlight';
    icon: 'cloud';
    description: '';
  };
  attributes: {
    title: Attribute.String;
    content: Attribute.Text;
    image: Attribute.Media;
  };
}

export interface CustomTypesLink extends Schema.Component {
  collectionName: 'components_custom_types_links';
  info: {
    displayName: 'link';
    description: '';
    icon: 'attachment';
  };
  attributes: {
    url: Attribute.String;
    target: Attribute.Enumeration<['_self', '_blank']> &
      Attribute.DefaultTo<'_blank'>;
    title: Attribute.String;
  };
}

export interface CustomTypesLocation extends Schema.Component {
  collectionName: 'components_custom_types_locations';
  info: {
    displayName: 'Location';
    icon: 'apps';
    description: '';
  };
  attributes: {
    city: Attribute.String;
    address: Attribute.Blocks;
    phone: Attribute.BigInteger;
    Email: Attribute.Email;
    Longitude: Attribute.BigInteger;
    Altitude: Attribute.BigInteger;
    Position: Attribute.Enumeration<['img-left', 'img-right']>;
  };
}

export interface CustomTypesLocationsHighlight extends Schema.Component {
  collectionName: 'components_custom_types_locations_highlights';
  info: {
    displayName: 'LocationsHighlight';
    icon: 'apps';
    description: '';
  };
  attributes: {
    City: Attribute.String;
    Image: Attribute.Media;
    Tag: Attribute.String;
  };
}

export interface CustomTypesSocial extends Schema.Component {
  collectionName: 'components_custom_types_socials';
  info: {
    displayName: 'Social';
    icon: 'discuss';
    description: '';
  };
  attributes: {
    icon: Attribute.Media;
    link: Attribute.Component<'custom-types.link'>;
    platform: Attribute.String;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'components.contact-form': ComponentsContactForm;
      'components.contact-show-case': ComponentsContactShowCase;
      'components.homepage-banner': ComponentsHomepageBanner;
      'components.info-highlights': ComponentsInfoHighlights;
      'components.locations-highlights': ComponentsLocationsHighlights;
      'components.page-banner': ComponentsPageBanner;
      'components.project-grids': ComponentsProjectGrids;
      'components.projects-cards': ComponentsProjectsCards;
      'components.projects-grid': ComponentsProjectsGrid;
      'components.text-media-banner': ComponentsTextMediaBanner;
      'components.text-media': ComponentsTextMedia;
      'custom-types.info-highlight': CustomTypesInfoHighlight;
      'custom-types.link': CustomTypesLink;
      'custom-types.location': CustomTypesLocation;
      'custom-types.locations-highlight': CustomTypesLocationsHighlight;
      'custom-types.social': CustomTypesSocial;
    }
  }
}

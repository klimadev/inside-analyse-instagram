export interface AnalysisResult {
  marca_nome: string;
  bio_atual: string;
  diagnostico: {
    biografia: string;
    identidade_visual: string;
    grade_posts: string;
  };
  plano_acao: string[];
}

export interface RebrandResult {
  branding_md: string;
  design_md: string;
  novo_perfil: {
    novo_user: string;
    nova_bio: string;
    seguidores: string;
    paleta_cores: string[];
    logo_prompt: string;
    destaques: { titulo: string; prompt: string }[];
    posts_prompts: string[];
  };
}

export interface GeneratedImages {
  logo?: string;
  destaques: string[];
  posts: string[];
}

export interface CopilotItem {
  tipo: string;
  texto: string;
  legenda?: string;
  imagem_prompt: string;
  imagem_gerada?: string;
}

export interface CopilotResponse {
  mensagem: string;
  itens_gerados: CopilotItem[];
}

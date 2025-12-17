// ============================================================================
// marcaController.js - Controller de Marcas
// HabibPerfumeShop - CRUD Completo
// ============================================================================

/**
 * Lista todas as marcas
 */
async function listar(req, res) {
    try {
        const result = await req.db.query(
            'SELECT * FROM marca ORDER BY nome_marca'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar marcas:', error);
        res.status(500).json({ 
            error: 'Erro ao listar marcas',
            message: error.message 
        });
    }
}

/**
 * Busca uma marca por ID
 */
async function buscarPorId(req, res) {
    try {
        const { id } = req.params;
        const result = await req.db.query(
            'SELECT * FROM marca WHERE id_marca = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Marca não encontrada' 
            });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar marca:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar marca',
            message: error.message 
        });
    }
}

/**
 * Busca marcas por nome (pesquisa parcial)
 */
async function buscarPorNome(req, res) {
    try {
        const { nome } = req.query;
        const result = await req.db.query(
            'SELECT * FROM marca WHERE LOWER(nome_marca) LIKE LOWER($1) ORDER BY nome_marca',
            [`%${nome}%`]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar marcas por nome:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar marcas',
            message: error.message 
        });
    }
}

/**
 * Cria uma nova marca
 */
async function criar(req, res) {
    try {
        const { nome_marca } = req.body;
        
        // Validação
        if (!nome_marca || nome_marca.trim() === '') {
            return res.status(400).json({ 
                error: 'Nome da marca é obrigatório' 
            });
        }
        
        // Verificar duplicidade
        const existe = await req.db.query(
            'SELECT id_marca FROM marca WHERE LOWER(nome_marca) = LOWER($1)',
            [nome_marca.trim()]
        );
        
        if (existe.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Já existe uma marca com este nome' 
            });
        }
        
        const result = await req.db.query(
            'INSERT INTO marca (nome_marca) VALUES ($1) RETURNING *',
            [nome_marca.trim()]
        );
        
        console.log(`✅ Marca criada: ${result.rows[0].nome_marca}`);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar marca:', error);
        res.status(500).json({ 
            error: 'Erro ao criar marca',
            message: error.message 
        });
    }
}

/**
 * Atualiza uma marca existente
 */
async function atualizar(req, res) {
    try {
        const { id } = req.params;
        const { nome_marca } = req.body;
        
        // Validação
        if (!nome_marca || nome_marca.trim() === '') {
            return res.status(400).json({ 
                error: 'Nome da marca é obrigatório' 
            });
        }
        
        // Verificar se a marca existe
        const marcaExiste = await req.db.query(
            'SELECT id_marca FROM marca WHERE id_marca = $1',
            [id]
        );
        
        if (marcaExiste.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Marca não encontrada' 
            });
        }
        
        // Verificar duplicidade (excluindo a própria marca)
        const duplicada = await req.db.query(
            'SELECT id_marca FROM marca WHERE LOWER(nome_marca) = LOWER($1) AND id_marca != $2',
            [nome_marca.trim(), id]
        );
        
        if (duplicada.rows.length > 0) {
            return res.status(409).json({ 
                error: 'Já existe outra marca com este nome' 
            });
        }
        
        const result = await req.db.query(
            'UPDATE marca SET nome_marca = $1 WHERE id_marca = $2 RETURNING *',
            [nome_marca.trim(), id]
        );
        
        console.log(`✅ Marca atualizada: ${result.rows[0].nome_marca}`);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar marca:', error);
        res.status(500).json({ 
            error: 'Erro ao atualizar marca',
            message: error.message 
        });
    }
}

/**
 * Remove uma marca
 */
async function remover(req, res) {
    try {
        const { id } = req.params;
        
        // Verificar se a marca existe
        const marcaExiste = await req.db.query(
            'SELECT nome_marca FROM marca WHERE id_marca = $1',
            [id]
        );
        
        if (marcaExiste.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Marca não encontrada' 
            });
        }
        
        // Verificar se há produtos usando esta marca
        const produtosVinculados = await req.db.query(
            'SELECT COUNT(*) as total FROM produto WHERE marca_id_marca = $1',
            [id]
        );
        
        if (parseInt(produtosVinculados.rows[0].total) > 0) {
            return res.status(409).json({ 
                error: 'Não é possível excluir esta marca',
                message: `Existem ${produtosVinculados.rows[0].total} produto(s) vinculado(s) a esta marca`
            });
        }
        
        await req.db.query('DELETE FROM marca WHERE id_marca = $1', [id]);
        
        console.log(`✅ Marca removida: ${marcaExiste.rows[0].nome_marca}`);
        res.json({ 
            message: 'Marca removida com sucesso',
            marca: marcaExiste.rows[0].nome_marca
        });
    } catch (error) {
        console.error('Erro ao remover marca:', error);
        res.status(500).json({ 
            error: 'Erro ao remover marca',
            message: error.message 
        });
    }
}

/**
 * Conta produtos por marca
 */
async function contarProdutosPorMarca(req, res) {
    try {
        const result = await req.db.query(`
            SELECT m.id_marca, m.nome_marca, COUNT(p.id_produto) as total_produtos
            FROM marca m
            LEFT JOIN produto p ON p.marca_id_marca = m.id_marca
            GROUP BY m.id_marca, m.nome_marca
            ORDER BY m.nome_marca
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao contar produtos por marca:', error);
        res.status(500).json({ 
            error: 'Erro ao contar produtos',
            message: error.message 
        });
    }
}

module.exports = {
    listar,
    buscarPorId,
    buscarPorNome,
    criar,
    atualizar,
    remover,
    contarProdutosPorMarca
};

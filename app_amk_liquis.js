const express = require('express');
const mariadb = require('mariadb');
const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");


const app = express();
require('dotenv').config()
const port = process.env.port;
const FILES_DIR = path.join(__dirname, process.env.dir_name); // Folder to store Excel files

if (!fs.existsSync(FILES_DIR)) {// Ensure the folder exists
    fs.mkdirSync(FILES_DIR);
	}


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let options = { maxAge: '2h', etag: false };  //cambiar a 2d
app.use(express.static('public', options));
app.use("/download", express.static(FILES_DIR));// Serve generated files for download


const db = mariadb.createPool({
    host: process.env.host_db,
    user: process.env.user_db,
    password: process.env.pwd_db,
    database: process.env.dbase,
    waitForConnections: true,
    connectionLimit: 4,
    queueLimit: 0
});



// Serve the `index.html` for the root URL
app.get("/", (req, res) => {
  res.sendFile("/home/manu/Documents/IFK/proyectos/ameca/public/ameca_nm.html");

});


// delete
app.get('/delete', async (req, res) => {
	const period = req.query.period || '202409';
    try {
    	const conn = await db.getConnection();
        const rows = await conn.query("delete FROM EstablecimientosLiquiMes WHERE periodo=?", period);
        conn.release();
        
       }
 	catch (error) {
        console.error('Database error:', error);
        msg=error;
        res.status(500).json({ msg: 'Database query failed'+error });
    }
    res.json ({msg:"periodo "+period+" eliminado"});
});




// Fetch active data
app.get('/data', async (req, res) => {
	const period = req.query.period || '202409';

    try {
    	const conn = await db.getConnection();
        const rows = await conn.query("SELECT elm.id_establecimiento, c.nombre_responsable, e.direccion_establecimiento, c.nro_cuit, elm.periodo, elm.base_imponible, elm.percepcion_iva, elm.percepcion_iibb, elm.compra_iva, elm.alicuota_iva, elm.alicuota_iibb, elm.saldo_iibb, elm.saldo_iva, elm.saldo_iva_reporte, elm.saldo_iibb_reporte, z.Zona as id_zona, e.id_comercio "+
" FROM EstablecimientosLiquiMes elm LEFT JOIN Establecimientos e ON elm.id_establecimiento = e.id_establecimiento LEFT JOIN Comercios c ON e.id_comercio = c.id_comercio LEFT JOIN Zonas z ON e.id_zona = z.idZona WHERE elm.periodo = '"+period+"' order by id_comercio");
        conn.release();
        //console.log("Fetched records:", rows.length);
        res.json(rows);
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database query failed' });
    }
});





// Insert Period 
app.get('/insert', async (req, res) => {
    const period = req.query.period || '202409';
    const period_dest = req.query.period_dest || '202409';
	const porc_bi = req.query.porc_bi|| 0;    //if (!porcentaje) return res.status(400).json({ error: "Percentage is required" });
	const porc_compras = req.query.porc_compras|| 0;
	const perc_iva = req.query.perc_iva|| 0;
	const perc_iibb = req.query.perc_iibb|| 0;
	
/*	*/
    try {
    //bi: 14.603.397,09  compra-iva: 12.438.423,04) * 0,21 - perc_iva: 210.065,80
    //round(((base_imponible-compra_iva )*alicuota_iva/100)-percepcion_iva , 2)

        const query =" INSERT INTO EstablecimientosLiquiMes (id_establecimiento, base_imponible, compra_iva, percepcion_iva, percepcion_iibb, periodo, alicuota_iibb, alicuota_iva, alicuota_pago_facil, activo_iva_periodo, activo_iibb_periodo, saldo_iva, saldo_iibb) SELECT id_establecimiento, @bi := base_imponible * (1+"+porc_bi+"/100), @c_iva:= compra_iva * (1+"+porc_compras+"/100), @perc_iva:=percepcion_iva * (1+"+perc_iva+"/100), @perc_iibb:=percepcion_iibb * (1+"+perc_iibb+"/100), '"+period_dest+"', alicuota_iibb, alicuota_iva, alicuota_pago_facil, activo_iva_periodo, activo_iibb_periodo, (@bi-@c_iva )*alicuota_iva/100-@perc_iva, @bi*alicuota_iibb/100-@perc_iibb FROM EstablecimientosLiquiMes  WHERE periodo = '"+period+"'";
        //console.log(query);
        await db.query(query);
        res.json({ msg: "Data updated successfully!", fetch:true, period: period_dest });
    } catch (error) {
        console.error('Update error:', error);
        res.json({ msg: "Update failed: "+error, fetch: false, period: null});
    }

});






//excel
app.get("/excel", async (req, res) => {

        const period = req.query.period || '202409';

    try {
    	const conn = await db.getConnection();
    	let last_id_cmr=0, vec_singles=[], vec_sucus=[], last_same=false, vec_acum_sucu=[,,,,,,,,,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const data = await conn.query("SELECT elm.id_establecimiento, c.nombre_responsable, e.direccion_establecimiento, c.nro_cuit, elm.periodo, elm.base_imponible, elm.percepcion_iva, elm.percepcion_iibb, elm.compra_iva, elm.alicuota_iva, elm.alicuota_iibb, elm.saldo_iibb, elm.saldo_iva, elm.saldo_iva_reporte, elm.saldo_iibb_reporte, z.Zona as id_zona, e.id_comercio "+
" FROM EstablecimientosLiquiMes elm LEFT JOIN Establecimientos e ON elm.id_establecimiento = e.id_establecimiento LEFT JOIN Comercios c ON e.id_comercio = c.id_comercio LEFT JOIN Zonas z ON e.id_zona = z.idZona WHERE elm.periodo = '"+period+"' order by id_comercio");
        conn.release();
        
        if (data.length === 0) {
            return res.status(404).send("No data found for the given period.");
        	}

        // Create a new Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Report", {views:[{state: 'frozen', xSplit: 4, ySplit:1}]});
        const work_sucus = workbook.addWorksheet("Sucursales", {views:[{state: 'frozen', xSplit: 4, ySplit:1}]});
        const columnas=["ID", "CUIT", "Nombre", "Direccion", "Zona", "Periodo", 
            "Alicuota IVA", "Alicuota IIBB", "Base Imponible", "Debito IVA", "Venta Total", "Compra IVA", "Credito IVA", "Compra Total", "Percepcion IVA", "Saldo IVA",
            "Debito IIBB", "Percepcion IIBB", "Saldo IIBB", "Saldo IVA Reporte", "Saldo IIBB Reporte"];
            

//builtin.com/software-engineering-perspectives/exceljs          
        // Define headers
        worksheet.addRow(columnas);
        work_sucus.addRow(columnas);
		const int_l=new Intl.NumberFormat('es-AR', {
  								minimumFractionDigits: 2,
  								maximumFractionDigits: 2
								});
        // Populate rows
        data.forEach(row => {
        	const id_cmr=row.id_comercio;
            const bi = row.base_imponible;
            const saldo_iibb = row.saldo_iibb;
            const saldo_iva = row.saldo_iva;
            const alic_iva = row.alicuota_iva;
            const alic_iibb = row.alicuota_iibb;
            const debito_iva = bi * alic_iva / 100;
            const debito_iibb = bi * alic_iibb / 100;
            const compra_iva = parseFloat(row.compra_iva);
            const iva_credito = compra_iva * alic_iva / 100;
            const venta_total = parseFloat(bi) + debito_iva;
            const compra_total = compra_iva + iva_credito;

//[,,,,,,,,bi, debito_iva, venta_total, compra_iva, iva_credito, compra_total, row.percepcion_iva, saldo_iva, debito_iibb, row.percepcion_iibb, saldo_iibb, saldo_iva, saldo_iibb]

           	const row_data=[ row.id_establecimiento, row.nro_cuit, row.nombre_responsable, row.direccion_establecimiento, row.id_zona, row.periodo, alic_iva, alic_iibb, int_l.format(bi), int_l.format(debito_iva), int_l.format(venta_total),
int_l.format(compra_iva), int_l.format(iva_credito), int_l.format(compra_total), int_l.format(row.percepcion_iva), int_l.format(saldo_iva), int_l.format(debito_iibb), int_l.format(row.percepcion_iibb), int_l.format(saldo_iibb), int_l.format(saldo_iva), int_l.format(saldo_iibb)];
           
	
            if (last_id_cmr==id_cmr) {
            	vec_sucus.push(row_data);
            	//console.log("valores iniciales de vec_acum_sucu: "+vec_acum_sucu+"\nbi inicial: "+vec_acum_sucu[9]);
            	vec_acum_sucu[9]+=parseFloat(bi);
            	vec_acum_sucu[10]+=parseFloat(debito_iva);
            	vec_acum_sucu[11]+=parseFloat(venta_total);
            	vec_acum_sucu[12]+=parseFloat(compra_iva);
            	vec_acum_sucu[13]+=parseFloat(iva_credito);
            	vec_acum_sucu[14]+=parseFloat(compra_total);
            	vec_acum_sucu[15]+=parseFloat(row.percepcion_iva);
            	vec_acum_sucu[16]+=parseFloat(saldo_iva);
            	
            	vec_acum_sucu[17]+=parseFloat(debito_iibb);
            	vec_acum_sucu[18]+=parseFloat(row.percepcion_iibb);
            	vec_acum_sucu[19]+=parseFloat(saldo_iibb);
            	vec_acum_sucu[20]=vec_acum_sucu[16];
            	vec_acum_sucu[21]=vec_acum_sucu[19];            	
            	if (!last_same) {
            		last_same=true;
            		const vec_temp=vec_singles.pop();
            		
            		let i=9;
            		for (;i<22;i++){
            			const num_temp=parseFloat(vec_temp[i-1].replace(/\./g, '').replace(',', '.'));
            			vec_acum_sucu[i]+=num_temp;
            			}
            		//vec_sucus.push(vec_temp.map((value, index) => (index >= 9 && index <= 19) ? int_l.format(value) : value));
    
    				vec_sucus.push(vec_temp);
            		}
            	}
            else {
            	if (last_same) {
            		vec_sucus.push(vec_acum_sucu.map(value => int_l.format(value)));
            		//agrego al array nueva fila de sumatoria
            		vec_acum_sucu=[,,,,,,,,,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            		}
            	last_id_cmr=id_cmr;
            	last_same=false
            	vec_singles.push(row_data);
            }

            
        });
		if (last_same) {//el ultimo comercio tenía sucursales
            vec_sucus.push(vec_acum_sucu.map(value => int_l.format(value)));
            vec_acum_sucu=[,,,,,,,,,0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }
        worksheet.addRows(vec_singles);
        work_sucus.addRows(vec_sucus);

// Define file path
        const fileName = `report_${period}.xlsx`;
        const filePath = path.join(FILES_DIR, fileName);

        // Save the file
        await workbook.xlsx.writeFile(filePath);

        // Respond with success message and file URL
        res.json({ success: true, fileUrl: `/download/${fileName}` });
    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).json({ success: false, message: "Error generating Excel file." });
    }
});




app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Button, TextField, Typography, Paper, Grid, List, ListItem, 
    ListItemText, IconButton, Divider, Box, Dialog, DialogTitle, 
    DialogContent, DialogActions, useTheme, useMediaQuery, Container,
    Card, CardContent
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import Chart from 'react-apexcharts';
import config from './config';

function App() {
    const [jars, setJars] = useState([]);
    const [newJar, setNewJar] = useState({ name: '', volume: '', sugar_spoons: '', tea_type: '', additives: '' });
    const [expandedJar, setExpandedJar] = useState(null);
    const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
    const [jarToRefresh, setJarToRefresh] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [jarToDelete, setJarToDelete] = useState(null);
    const [showAddJarForm, setShowAddJarForm] = useState(false);

    // Автоматическое обновление данных каждые 5 минут
    useEffect(() => {
        fetchJars();
        const interval = setInterval(fetchJars, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchJars = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/jars`);
            setJars(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const addJar = async () => {
        try {
            await axios.post(`${config.apiUrl}/jars`, newJar);
            setNewJar({ name: '', volume: '', sugar_spoons: '', tea_type: '', additives: '' });
            fetchJars();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteClick = (e, id) => {
        e.stopPropagation();
        setJarToDelete(id);
        setDeleteDialogOpen(true);
    };

    const deleteJar = async () => {
        try {
            await axios.delete(`${config.apiUrl}/jars/${jarToDelete}`);
            setDeleteDialogOpen(false);
            setJarToDelete(null);
            fetchJars();
        } catch (error) {
            console.error(error);
        }
    };

    const handleRefreshClick = (e, id) => {
        e.stopPropagation();
        setJarToRefresh(id);
        setRefreshDialogOpen(true);
    };

    const refreshJar = async () => {
        try {
            await axios.post(`${config.apiUrl}/jars/${jarToRefresh}/refresh`);
            setRefreshDialogOpen(false);
            setJarToRefresh(null);
            fetchJars();
        } catch (error) {
            console.error(error);
        }
    };

    const handleJarClick = (jar) => {
        setExpandedJar(expandedJar === jar.id ? null : jar.id);
    };

    const calculateChartData = (jar) => {
        const updates = JSON.parse(jar.updates || '[]');
        const allData = [
            {
                date: jar.start_date,
                organic_acids: 0,
                vitamin_c: 0,
                vitamin_b1: 0,
                vitamin_b2: 0,
                probiotics: 0,
                sweetness_level: 100,
                carbonation: 0,
                ph: 4.5,
                alcohol: 0
            },
            ...updates.map(update => ({
                date: update.date,
                organic_acids: update.measurements?.organic_acids || 0,
                vitamin_c: update.measurements?.vitamin_c || 0,
                vitamin_b1: update.measurements?.vitamin_b1 || 0,
                vitamin_b2: update.measurements?.vitamin_b2 || 0,
                probiotics: update.measurements?.probiotics || 0,
                sweetness_level: update.measurements?.sweetness_level || 0,
                carbonation: update.measurements?.carbonation || 0,
                ph: update.measurements?.ph || 4.5,
                alcohol: update.measurements?.alcohol || 0
            })),
            // Добавляем текущие значения в конец массива
            {
                date: new Date().toISOString(),
                organic_acids: jar.organic_acids || 0,
                vitamin_c: jar.vitamin_c || 0,
                vitamin_b1: jar.vitamin_b1 || 0,
                vitamin_b2: jar.vitamin_b2 || 0,
                probiotics: jar.probiotics || 0,
                sweetness_level: jar.sweetness_level || 0,
                carbonation: jar.carbonation || 0,
                ph: jar.ph || 4.5,
                alcohol: jar.alcohol || 0
            }
        ];

        return {
            options: {
                chart: {
                    type: 'line',
                    animations: {
                        enabled: false
                    }
                },
                xaxis: {
                    type: 'datetime',
                    categories: allData.map(data => new Date(data.date).getTime())
                },
                yaxis: [
                    {
                        title: { text: 'Значение' },
                        max: 100,
                        min: 0
                    },
                    {
                        title: { text: 'pH/Алкоголь' },
                        max: 7,
                        min: 0,
                        opposite: true
                    }
                ],
                tooltip: {
                    x: {
                        format: 'dd MMM yyyy HH:mm'
                    }
                }
            },
            series: [
                {
                    name: 'Органические кислоты (мг/л)',
                    data: allData.map(data => data.organic_acids || 0)
                },
                {
                    name: 'Витамин C (мг/100мл)',
                    data: allData.map(data => data.vitamin_c || 0)
                },
                {
                    name: 'Витамин B1 (мг/100мл)',
                    data: allData.map(data => data.vitamin_b1 || 0)
                },
                {
                    name: 'Витамин B2 (мг/100мл)',
                    data: allData.map(data => data.vitamin_b2 || 0)
                },
                {
                    name: 'Пробиотики (КОЕ/мл)',
                    data: allData.map(data => (data.probiotics || 0) / 10000)
                },
                {
                    name: 'Сладость (%)',
                    data: allData.map(data => data.sweetness_level || 0)
                },
                {
                    name: 'Газация',
                    data: allData.map(data => data.carbonation || 0)
                },
                {
                    name: 'pH',
                    data: allData.map(data => data.ph || 4.5)
                },
                {
                    name: 'Алкоголь (%)',
                    data: allData.map(data => data.alcohol || 0)
                }
            ]
        };
    };

    const calculateDaysSinceStart = (startDate) => {
        const start = new Date(startDate);
        const now = new Date();
        const diffTime = Math.abs(now - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    return (
        <Container maxWidth="lg" sx={{ py: 2 }}>
            <Typography variant="h3" align="center" gutterBottom sx={{ 
                fontWeight: 'bold',
                color: '#2E7D32',
                mb: 4,
                fontFamily: "'Roboto', sans-serif",
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}>
                🍵 KombuchaLab
            </Typography>
            <Grid container spacing={2}>
                {/* Кнопка добавления новой банки */}
                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setShowAddJarForm(!showAddJarForm)}
                        sx={{ mb: 2 }}
                    >
                        {showAddJarForm ? 'Скрыть форму' : '+ Добавить новую банку'}
                    </Button>
                </Grid>
                
                {/* Форма добавления новой банки */}
                {showAddJarForm && (
                    <Grid item xs={12} md={4}>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Новая банка
                            </Typography>
                            <Box component="form" sx={{ '& .MuiTextField-root': { my: 1, width: '100%' } }}>
                                <TextField
                                    fullWidth
                                    label="Название"
                                    value={newJar.name}
                                    onChange={(e) => setNewJar({ ...newJar, name: e.target.value })}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Объем"
                                    value={newJar.volume}
                                    onChange={(e) => setNewJar({ ...newJar, volume: e.target.value })}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Количество столовых ложек сахара"
                                    value={newJar.sugar_spoons}
                                    onChange={(e) => setNewJar({ ...newJar, sugar_spoons: e.target.value })}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Тип чая"
                                    value={newJar.tea_type}
                                    onChange={(e) => setNewJar({ ...newJar, tea_type: e.target.value })}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Добавки"
                                    value={newJar.additives}
                                    onChange={(e) => setNewJar({ ...newJar, additives: e.target.value })}
                                    margin="normal"
                                />
                                <Button
                                    variant="contained"
                                    onClick={addJar}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                >
                                    Добавить
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                )}

                {/* Список банок */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>
                            Мои банки
                        </Typography>
                        <List sx={{ width: '100%' }}>
                            {jars.map((jar) => (
                                <Card 
                                    key={jar.id}
                                    sx={{ 
                                        mb: 2,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'action.hover' }
                                    }}
                                    onClick={() => handleJarClick(jar)}
                                >
                                    <CardContent>
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                            flexWrap: 'wrap',
                                            gap: 1
                                        }}>
                                            <Box>
                                                <Typography variant="subtitle1" component="div" gutterBottom>
                                                    {jar.name}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    Создано: {formatDate(jar.start_date)}<br/>
                                                    Дней настаивания: {calculateDaysSinceStart(jar.start_date)}<br/>
                                                    Объем: {jar.volume}л • Сахар: {jar.sugar_spoons} ст.л.<br/>
                                                    Чай: {jar.tea_type} • Добавки: {jar.additives}
                                                </Typography>
                                                <Grid container spacing={1} sx={{ mt: 1 }}>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Кислоты: {(jar.organic_acids || 0).toFixed(1)} мг/л
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Вит.C: {(jar.vitamin_c || 0).toFixed(1)} мг/100мл
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Вит.B1: {(jar.vitamin_b1 || 0).toFixed(1)} мг/100мл
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Вит.B2: {(jar.vitamin_b2 || 0).toFixed(1)} мг/100мл
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Пробиотики: {(jar.probiotics || 0).toFixed(0)} КОЕ/мл
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            pH: {(jar.ph || 4.5).toFixed(1)}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Сладость: {(jar.sweetness_level || 0).toFixed(1)}%
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Газация: {(jar.carbonation || 0).toFixed(1)}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={6} sm={4}>
                                                        <Typography variant="body2" color="text.secondary">
                                                            Алкоголь: {(jar.alcohol || 0).toFixed(2)}%
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                <IconButton
                                                    onClick={(e) => handleRefreshClick(e, jar.id)}
                                                    size="small"
                                                    aria-label={`Обновить банку ${jar.name}`}
                                                >
                                                    <RefreshIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={(e) => handleDeleteClick(e, jar.id)}
                                                    size="small"
                                                    color="default"
                                                    aria-label={`Удалить банку ${jar.name}`}
                                                    sx={{ color: 'text.secondary' }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        </Box>
                                        {expandedJar === jar.id && (
                                            <Box sx={{ 
                                                width: '100%', 
                                                height: isMobile ? '300px' : '400px',
                                                mt: 2
                                            }}>
                                                <Chart
                                                    options={{
                                                        ...calculateChartData(jar).options,
                                                        chart: {
                                                            ...calculateChartData(jar).options.chart,
                                                            toolbar: {
                                                                show: !isMobile
                                                            }
                                                        }
                                                    }}
                                                    series={calculateChartData(jar).series}
                                                    height="100%"
                                                />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Диалоги */}
            <Dialog 
                open={refreshDialogOpen} 
                onClose={() => setRefreshDialogOpen(false)}
                aria-labelledby="refresh-dialog-title"
                aria-describedby="refresh-dialog-description"
            >
                <DialogTitle id="refresh-dialog-title">Подтверждение обновления</DialogTitle>
                <DialogContent>
                    <Typography id="refresh-dialog-description">
                        Вы уверены, что хотите обновить банку? 
                        Это действие обнулит текущие показатели, но сохранит историю изменений.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRefreshDialogOpen(false)} autoFocus>Отмена</Button>
                    <Button onClick={refreshJar} color="primary">Обновить</Button>
                </DialogActions>
            </Dialog>

            <Dialog 
                open={deleteDialogOpen} 
                onClose={() => setDeleteDialogOpen(false)}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">Подтверждение удаления</DialogTitle>
                <DialogContent>
                    <Typography id="delete-dialog-description">
                        Вы уверены, что хотите удалить эту банку? 
                        Это действие нельзя будет отменить.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} autoFocus>Отмена</Button>
                    <Button onClick={deleteJar} color="error">Удалить</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default App;